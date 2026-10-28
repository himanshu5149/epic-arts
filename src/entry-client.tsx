import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { StoreProvider } from './store';
import {CatalogProvider,type BootData} from './catalog';
import './styles.css';
const container=document.getElementById('root')!;
let initial:BootData={};try{initial=JSON.parse(document.getElementById('epic-boot')?.textContent||'{}');}catch{}
const tree=<BrowserRouter><CatalogProvider initial={initial}><StoreProvider><App/></StoreProvider></CatalogProvider></BrowserRouter>;
if(container.innerHTML.trim())hydrateRoot(container,tree);else createRoot(container).render(tree);
if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});}
