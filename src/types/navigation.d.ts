export {};

declare global {
  namespace ReactNavigation {
    interface RootParamList {
      Main: undefined;
      Dashboard: undefined;
      BuyTransactions: undefined;
      SellTransactions: undefined;
      LendTransactions: undefined;
      ExpenseTransactions: undefined;
      AddBuyTransaction: undefined;
      BuyTransactionDetail: {id: string};
    }
  }
}
