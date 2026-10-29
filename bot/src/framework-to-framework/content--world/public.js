import {contentWorldSource} from '../../frameworks/content/public.js';
import {requireCitySource} from '../../frameworks/world/public.js';
export function connectContentWorldSource(){return contentWorldSource.bind({requireCitySource});}
