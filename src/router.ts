import { pageRoutes } from 'virtual:file-routes';
import {createRouter, hashHistory} from '@solidjs/router';
import { fileRoutes } from '@solidjs/router/fs';

export const Router = createRouter({ routes: fileRoutes(pageRoutes), history: hashHistory() });

export const { paths } = Router;
