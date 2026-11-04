/** Calculadora de domínio para impedir pagamentos/descontos inválidos. */
export function cents(reais:number):number {if(!Number.isFinite(reais)||reais<0)throw new Error('Valor inválido');return Math.round(reais*100);}
export function saleTotal(items:{finalPrice:number}[],discount:number):number {
 const subtotal=items.reduce((acc,item)=>acc+cents(item.finalPrice),0),d=cents(discount);
 if(d>subtotal)throw new Error('Desconto supera subtotal');return (subtotal-d)/100;
}
export function canPay(total:number,received:number,payment:number):boolean {return cents(payment)>0&&cents(received)+cents(payment)<=cents(total);}
