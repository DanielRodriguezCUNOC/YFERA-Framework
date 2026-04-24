import Dexie from "dexie";
import { DB_NAME, DB_VERSION, TABLAS } from "./schema.js";

const baseDeDatosArbol = new Dexie(DB_NAME);

baseDeDatosArbol.version(DB_VERSION).stores(TABLAS);

export { baseDeDatosArbol };

export default baseDeDatosArbol;
