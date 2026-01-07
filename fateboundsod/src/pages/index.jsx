import Layout from "./Layout.jsx";

import DeckBuilder from "./DeckBuilder";

import Profile from "./Profile";

import Shop from "./Shop";

import TCG from "./TCG";

import Tutorial from "./Tutorial";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    DeckBuilder: DeckBuilder,
    
    Profile: Profile,
    
    Shop: Shop,
    
    TCG: TCG,
    
    Tutorial: Tutorial,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<DeckBuilder />} />
                
                
                <Route path="/DeckBuilder" element={<DeckBuilder />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/Shop" element={<Shop />} />
                
                <Route path="/TCG" element={<TCG />} />
                
                <Route path="/Tutorial" element={<Tutorial />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}