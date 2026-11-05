import { PaymentPanel } from "../finance/PaymentPanel";
import type { PaymentMethod } from "./api";
interface Props {
  amount: number;
  close: () => void;
  saving: boolean;
  save: (input: { amount: number; method: PaymentMethod; paidAt: string; requestKey: string }) => void;
}
export function ExpensePaymentPanel({ amount, close, saving, save }: Props) {
  return (
    <PaymentPanel
      expense
      balance={amount}
      close={close}
      saving={saving}
      save={(paymentAmount, method, _installments, requestKey, paidAt) =>
        save({ amount: paymentAmount, method, paidAt, requestKey })
      }
    />
  );
}
