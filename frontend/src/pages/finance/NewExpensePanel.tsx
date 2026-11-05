import {ExpenseEditor} from "../expenses/ExpenseEditor";
import type {CreateExpenseInput} from "../../lib/api";
export function NewExpensePanel({close,save,saving}:{close:()=>void;save:(input:CreateExpenseInput)=>void|Promise<void>;saving:boolean}){return <ExpenseEditor close={close} onSubmit={save} busy={saving}/>;}
