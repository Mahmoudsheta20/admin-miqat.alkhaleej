export interface SanityFleetModel {
  _id: string;
  name: string;
  arabicName: string;
  category: string;
  year: string;
  upTo: string;
  luggage: string;
  features: string[];
  imageUrl: string | null;
}

export async function fetchSanityFleetModels(): Promise<SanityFleetModel[]> {
  const projectId = "4eyqi74z";
  const dataset = "production";
  const query = encodeURIComponent(`*[_type == "fleet"]{
    _id,
    name,
    arabicName,
    category,
    year,
    upTo,
    luggage,
    features,
    "imageUrl": image.asset->url
  }`);
  
  const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`;
  
  try {
    const res = await fetch(url, { 
      // Next.js fetch options for caching
      next: { revalidate: 60 } 
    });
    const data = await res.json();
    return data.result || [];
  } catch (error) {
    console.error("Error fetching Sanity fleet:", error);
    return [];
  }
}
