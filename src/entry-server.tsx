import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import { StoreProvider } from './store';
import {CatalogProvider,type BootData} from './catalog';
export function render(url:string,initial:BootData={}){return renderToString(<StaticRouter location={url}><CatalogProvider initial={initial}><StoreProvider><App/></StoreProvider></CatalogProvider></StaticRouter>);}
