import TransactionManager from "../components/TransactionManager";

export default function Expenses() {
  return (
    <TransactionManager
      type="expense"
      title="Expenses"
      icon="💸"
      accentClass="bg-rose-600 hover:bg-rose-700"
    />
  );
}
