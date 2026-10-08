import type { Craft } from "./mockData";
import { paperCraftsA } from "./paper-crafts-a";
import { paperCraftsB } from "./paper-crafts-b";

/* 40 простых поделок из бумаги и картона — подключаются к общему каталогу. */
export const paperCrafts: Craft[] = [...paperCraftsA, ...paperCraftsB];
