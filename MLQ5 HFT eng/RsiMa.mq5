#property copyright "Copyright 2020, MetaQuotes Software Corp."
#property link "https://www.mql5.com"
#property version "1.00"
#include <Trade\Trade.mqh>

// Input parameters
input long inpMagicNumber = 546812;
input double InpLotSize = 0.1;
input int InpRsiPeriod = 21;
input double InpRsiLevel = 70;
input int InpMaPeriod = 21;
input ENUM_TIMEFRAMES InpMaTimeframe = PERIOD_H1;
input int InpStopLoss = 200;
input int InpTakeProfit = 100;
input bool InpCloseSignal = false;

// Global variables
int handleRSI;
int handleMA;
double bufferRSI[];
double bufferMA[];
MqlTick currentTick;
CTrade trade;

// OnInit function
int OnInit()
{
    // Validate input parameters
    if (inpMagicNumber <= 0)
    {
        Alert("Magic number must be greater than 0");
        return INIT_PARAMETERS_INCORRECT;
    }
    if (InpLotSize <= 0 || InpLotSize > 10)
    {
        Alert("Lot size must be greater than 0 and less than 10");
        return INIT_PARAMETERS_INCORRECT;
    }
    if (InpRsiPeriod <= 1)
    {
        Alert("RSI period must be greater than 1");
        return INIT_PARAMETERS_INCORRECT;
    }
    if (InpRsiLevel >= 100 || InpRsiLevel <= 50)
    {
        Alert("RSI level must be greater than 50 and less than 100");
        return INIT_PARAMETERS_INCORRECT;
    }
    if (InpMaPeriod <= 1)
    {
        Alert("MA period must be greater than 1");
        return INIT_PARAMETERS_INCORRECT;
    }
    if (InpStopLoss < 0)
    {
        Alert("Stop loss must be greater than or equal to 0");
        return INIT_PARAMETERS_INCORRECT;
    }
    if (InpTakeProfit < 0)
    {
        Alert("Take profit must be greater than or equal to 0");
        return INIT_PARAMETERS_INCORRECT;
    }

    // Set magic number for the trade object
    trade.SetExpertMagicNumber(inpMagicNumber);

    // Create RSI indicator
    handleRSI = iRSI(_Symbol, _Period, InpRsiPeriod, PRICE_CLOSE);
    if (handleRSI == INVALID_HANDLE)
    {
        Alert("Failed to create RSI indicator");
        return INIT_FAILED;
    }

    // Create MA indicator
    handleMA = iMA(_Symbol, InpMaTimeframe, InpMaPeriod, 0, MODE_SMA, PRICE_CLOSE);
    if (handleMA == INVALID_HANDLE)
    {
        Alert("Failed to create MA indicator");
        return INIT_FAILED;
    }

    // Set buffers as series
    ArraySetAsSeries(bufferRSI, true);
    ArraySetAsSeries(bufferMA, true);

    return INIT_SUCCEEDED;
}

// OnDeinit function
void OnDeinit(const int reason)
{
    // Release indicator handles
    if (handleRSI != INVALID_HANDLE)
    {
        IndicatorRelease(handleRSI);
    }
    if (handleMA != INVALID_HANDLE)
    {
        IndicatorRelease(handleMA);
    }
}

// OnTick function
void OnTick()
{
    // Check if current tick is a new bar open
    if (!IsNewBar())
    {
        return;
    }

    // Get current tick
    if (!SymbolInfoTick(_Symbol, currentTick))
    {
        Print("Failed to get current tick");
        return;
    }

    // Get RSI value
    if (CopyBuffer(handleRSI, 0, 0, 2, bufferRSI) <= 0) // Copy 2 values for comparison
    {
        Print("Failed to get RSI value");
        return;
    }

    // Get MA value
    if (CopyBuffer(handleMA, 0, 0, 1, bufferMA) <= 0)
    {
        Print("Failed to get MA value");
        return;
    }

    // Print values for debugging
    Comment("bufferRSI[0]: ", bufferRSI[0],
            "\nbufferRSI[1]: ", bufferRSI[1],
            "\nbufferMA[0]: ", bufferMA[0]);

    // Count open positions
    int cntBuy, cntSell;
    if (!CountOpenPositions(cntBuy, cntSell))
    {
        return;
    }

    // Check for buy positions
    if (cntBuy == 0 && bufferRSI[1] >= (100 - InpRsiLevel) && bufferRSI[0] < (100 - InpRsiLevel) && currentTick.ask > bufferMA[0])
    {
        if (InpCloseSignal)
        {
            if (!ClosePositions(POSITION_TYPE_SELL)) // Close sell positions
            {
                return;
            }
        }

        double sl = InpStopLoss == 0 ? 0 : currentTick.bid - InpStopLoss * _Point;
        double tp = InpTakeProfit == 0 ? 0 : currentTick.bid + InpTakeProfit * _Point;

        if (!NormalizePrice(sl) || !NormalizePrice(tp))
        {
            return;
        }

        trade.Buy(InpLotSize, _Symbol, currentTick.ask, sl, tp, "RSI MA filter automated");
    }

    // Check for sell positions
    if (cntSell == 0 && bufferRSI[1] <= InpRsiLevel && bufferRSI[0] > InpRsiLevel && currentTick.bid < bufferMA[0])
    {
        if (InpCloseSignal)
        {
            if (!ClosePositions(POSITION_TYPE_BUY)) // Close buy positions
            {
                return;
            }
        }

        double sl = InpStopLoss == 0 ? 0 : currentTick.ask + InpStopLoss * _Point;
        double tp = InpTakeProfit == 0 ? 0 : currentTick.ask - InpTakeProfit * _Point;

        if (!NormalizePrice(sl) || !NormalizePrice(tp))
        {
            return;
        }

        trade.Sell(InpLotSize, _Symbol, currentTick.bid, sl, tp, "RSI MA filter automated");
    }
}

// Custom function to check if it's a new bar
bool IsNewBar()
{
    static datetime previousTime = 0;
    datetime currentTime = iTime(_Symbol, _Period, 0);
    if (previousTime != currentTime)
    {
        previousTime = currentTime;
        return true;
    }
    return false;
}

// Custom function to normalize price
bool NormalizePrice(double &price)
{
    double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
    if (tickSize == 0)
    {
        Print("Failed to get tick size");
        return false;
    }
    price = NormalizeDouble(MathRound(price / tickSize) * tickSize, _Digits);
    return true;
}

// Custom function to count open positions
bool CountOpenPositions(int &cntBuy, int &cntSell)
{
    cntBuy = 0;
    cntSell = 0;
    for (int i = PositionsTotal() - 1; i >= 0; i--)
    {
        ulong ticket = PositionGetTicket(i);
        if (ticket <= 0)
        {
            Print("Failed to get ticket number");
            return false;
        }
        if (!PositionSelectByTicket(ticket))
        {
            Print("Failed to select position by ticket number");
            return false;
        }
        long magic;
        if (!PositionGetInteger(POSITION_MAGIC, magic))
        {
            Print("Failed to get magic number");
            return false;
        }
        if (magic == inpMagicNumber)
        {
            long type;
            if (!PositionGetInteger(POSITION_TYPE, type))
            {
                Print("Failed to get position type");
                return false;
            }
            if (type == POSITION_TYPE_BUY)
            {
                cntBuy++;
            }
            else if (type == POSITION_TYPE_SELL)
            {
                cntSell++;
            }
        }
    }
    return true;
}

// Custom function to close positions
bool ClosePositions(int positionType)
{
    int total = PositionsTotal();
    for (int i = total - 1; i >= 0; i--)
    {
        ulong ticket = PositionGetTicket(i);
        if (ticket <= 0)
        {
            Print("Failed to get ticket number");
            return false;
        }
        if (!PositionSelectByTicket(ticket))
        {
            Print("Failed to select position by ticket number");
            return false;
        }
        long magic;
        if (!PositionGetInteger(POSITION_MAGIC, magic))
        {
            Print("Failed to get magic number");
            return false;
        }
        if (magic == inpMagicNumber)
        {
            long type;
            if (!PositionGetInteger(POSITION_TYPE, type))
            {
                Print("Failed to get position type");
                return false;
            }
            if (type == positionType)
            {
                trade.PositionClose(ticket);
                if (trade.ResultRetcode() != TRADE_RETCODE_DONE)
                {
                    Print("Failed to close position ", "ticket: ", (string)ticket, " result: ", (string)trade.ResultRetcode(), ": ", trade.CheckResultRetcodeDescription());
                    return false;
                }
            }
        }
    }
    return true;
}