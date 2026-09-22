-- Add the 20 collectible Deathbound designs; Risen is effect-only.
-- Existing catalog entries, rarities, balances and owned cards are preserved.
insert into public.store_catalog(id,name,element,card_type) values
('CTRL_BLD_DB01','Veyra, the Bloodmother','blood','controller'),
('CTRL_SHD_DB01','Mordrath, Keeper of Graves','shadow','controller'),
('CRTE_SHD_DB01','Graveborn Wretch','shadow','creature'),
('CRTE_BLD_DB01','Blood Husk','blood','creature'),
('CRTE_SHD_DB02','Crypt Crawler','shadow','creature'),
('CRTE_BLD_DB02','Blood Stitcher','blood','creature'),
('CRTE_SHD_DB03','Gravecaller','shadow','creature'),
('CRTE_BLD_DB03','Corpse Harvester','blood','creature'),
('CRTE_SHD_DB04','Hollow Knight','shadow','creature'),
('CRTE_BLD_DB04','Sanguine Ghoul','blood','creature'),
('CRTE_SHD_DB05','Gravebound Horror','shadow','creature'),
('CRTE_BLD_DB05','Flesh Colossus','blood','creature'),
('CRTE_MIX_DB01','The First Corpse','shadow','creature'),
('SPEL_BLD_DB01','Fresh Corpse','blood','spell'),
('SPEL_SHD_DB01','Shadow''s Grasp','shadow','spell'),
('SPEL_BLD_DB02','Bloodletting','blood','spell'),
('SPEL_BLD_DB03','Feast of Corpses','blood','spell'),
('SPEL_SHD_DB02','Call From Below','shadow','spell'),
('SPEL_MIX_DB01','Death Wave','shadow','spell'),
('PERS_SHD_DB01','The Bone Pit','shadow','spell')
on conflict(id) do nothing;
