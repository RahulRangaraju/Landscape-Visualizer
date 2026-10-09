import type { Feature } from 'geojson';

export interface ParcelInfo {
    pin: string | null;
    address: string | null;
    acres: number | null;
    landUse: string | null;
    zoning: string | null;
    marketValue: number | null;
    lastSalePrice: number | null;
    lastSaleDate: Date | null;
}

export interface County {
    name: string;
    parcelUrl: string;
    toParcelInfo(feature: Feature): ParcelInfo;
}

// Counties write "nothing here" in different ways: " ", 0, null.
function cleanText(v: unknown): string | null {
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function positive(v: unknown): number | null {
    return typeof v === 'number' && v > 0 ? v : null;
}

function toDate(v: unknown): Date | null {
    if (typeof v !== 'number' && typeof v !== 'string') return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

export const greenville: County = {
    name: 'Greenville',
    parcelUrl: 'https://citygis.greenvillesc.gov/arcgis/rest/services/AddressSearch/Property/MapServer/3/query',
    toParcelInfo(feature) {
        const p = feature.properties ?? {};
        return {
            pin: cleanText(p.PIN),
            address: cleanText(`${p.STRNUM ?? ''} ${p.LOCATE ?? ''}`),   // STRNUM = house number (not verified)
            acres: positive(p.GIS_ACRES),
            landUse: cleanText(p.DESCR),
            zoning: null,                       // needs its own layer, not found yet
            marketValue: positive(p.TAXMKTVAL),
            lastSalePrice: positive(p.SLPRICE),
            lastSaleDate: null,                 // DEEDTE format not checked yet
        };
    },
};

export const pickens: County = {
    name: 'Pickens',
    parcelUrl: 'https://services1.arcgis.com/59960rq18IxUcAVI/arcgis/rest/services/Pickens_Open_data/FeatureServer/6/query',
    toParcelInfo(feature) {
        const p = feature.properties ?? {};
        return {
            pin: cleanText(p.PIN),
            address: cleanText(p.LOCADD),
            acres: positive(p.CalcAcres) ?? positive(p.ACRES),
            landUse: null,                      // decide after we see IMPVAC values
            zoning: cleanText(p.ZONINGCODE),
            marketValue: null,                  // not in this layer
            lastSalePrice: positive(p.SALEP),
            lastSaleDate: toDate(p.SALEDT),
        };
    },
};

export const counties: County[] = [greenville, pickens];
