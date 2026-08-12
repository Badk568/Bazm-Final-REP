INSERT INTO category(slug,name) VALUES ('music','Music'),('workshops','Workshops'),('comedy','Comedy'),('art','Art'),('food','Food'),('conversations','Conversations') ON CONFLICT DO NOTHING;
-- The six complete demonstration event records and tiers are maintained in lib/data.ts.
-- Mirror them through the production repository adapter after approved dates and content are supplied.
