import type{Metadata}from"next";import"./globals.css";
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000"),title:{default:"Bazm · Hyderabad",template:"%s · Bazm"},description:"Music, art, stories, workshops, food and conversations at Bazm in Hyderabad, Sindh.",openGraph:{siteName:"Bazm",type:"website",locale:"en_PK",images:["/assets/venue-wall.png"]}};
export default function Layout({children}:{children:React.ReactNode}){return<html lang="en"><body>{children}</body></html>}
