import{notFound}from"next/navigation";
import Nav from"@/components/Nav";
import Footer from"@/components/Footer";
import CheckoutForm from"@/components/CheckoutForm";
import{getPublishedEventBySlug,toPublicEvent}from"@/lib/events";
import{eventDate}from"@/lib/format";
export const dynamic="force-dynamic";
export const metadata={title:"Checkout",robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{orderId:string}>;searchParams:Promise<{tier?:string;quantity?:string}>}){const managed=await getPublishedEventBySlug((await params).orderId),query=await searchParams;if(!managed||managed.status!=="PUBLISHED")notFound();const event=await toPublicEvent(managed),tier=event.tiers.find(item=>item.id===query.tier)||event.tiers[0];if(!tier)notFound();return<main><Nav/><header className="checkout-head paper"><div className="container"><p className="kicker">Secure checkout</p><h1>Reserve your place.</h1><div><img src={event.image} alt="Event artwork"/><span><b>{event.title}</b><small>{eventDate(event.date,{weekday:"long",day:"numeric",month:"long"})} · {event.start} PKT</small></span></div></div></header><section className="section"><CheckoutForm event={event} tierId={tier.id} initial={Number(query.quantity)||1}/></section><Footer/></main>}
