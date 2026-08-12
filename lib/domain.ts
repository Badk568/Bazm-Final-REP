import type{OrderStatus}from"./types";
export const activeHoldStatuses:OrderStatus[]=["AWAITING_PAYMENT_PROOF","PAYMENT_PROOF_SUBMITTED","UNDER_ORGANISER_REVIEW"];
export const calculateTotal=(unitPrice:number,quantity:number,fee=0)=>{if(!Number.isInteger(unitPrice)||unitPrice<0||!Number.isInteger(quantity)||quantity<1||!Number.isInteger(fee)||fee<0)throw Error("Invalid order total inputs");return unitPrice*quantity+fee};
export const isExpired=(expiresAt:string,now=Date.now())=>Date.parse(expiresAt)<=now;
const transitions:Record<OrderStatus,OrderStatus[]>={AWAITING_PAYMENT_PROOF:["PAYMENT_PROOF_SUBMITTED","EXPIRED","CANCELLED"],PAYMENT_PROOF_SUBMITTED:["UNDER_ORGANISER_REVIEW","CONFIRMED","PAYMENT_REJECTED","CANCELLED"],UNDER_ORGANISER_REVIEW:["CONFIRMED","PAYMENT_REJECTED","CANCELLED"],PAYMENT_REJECTED:["PAYMENT_PROOF_SUBMITTED","EXPIRED","CANCELLED"],CONFIRMED:["CANCELLED","REFUNDED"],EXPIRED:["PAYMENT_REJECTED"],CANCELLED:[],REFUNDED:[]};
export const canTransition=(from:OrderStatus,to:OrderStatus)=>from===to||transitions[from].includes(to);
