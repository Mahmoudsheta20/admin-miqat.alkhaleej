import { cookies } from "next/headers";
import { localizeText } from "./localization";
export async function localizedMetadataTitle(title:string){const preferences=await cookies();return localizeText(title,preferences.get("miqat_language")?.value==="en"?"en":"ar");}
