export {};

declare global {
  namespace ReactNavigation {
    interface RootParamList {
      Login: undefined;
      SignUp: undefined;
      Main: undefined;
      Dashboard: undefined;
      BuyTransactions: undefined;
      SellTransactions: undefined;
      LendTransactions: undefined;
      ExpenseTransactions: undefined;
      Settings: undefined;
      AddBuyTransaction: undefined;
      AddSellTransaction: undefined;
      AddLendTransaction: undefined;
      AddExpenseTransaction: undefined;
      BuyTransactionDetail: {id: string};
      SellTransactionDetail: {id: string};
      LendTransactionDetail: {id: string};
      ExpenseTransactionDetail: {id: string};
    }
  }
}
