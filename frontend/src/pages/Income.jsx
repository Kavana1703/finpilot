import TransactionManager from "../components/TransactionManager";

export default function Income() {
  return (
    <TransactionManager
      type="income"
      title="Income"
      icon="💵"
      accentClass="bg-brand-600 hover:bg-brand-700"
    />
  );
}
