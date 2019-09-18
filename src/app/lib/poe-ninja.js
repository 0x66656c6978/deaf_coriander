const Segments = [
    'Fragment',
    'Currency',
    'Oil',
    'Incubator',
    'Scarab',
    'Fossil',
    'Resonator',
    'Essence',
    'DivinationCard',
    'Prophecy',
    'SkillGem',
    'BaseType',
    'HelmetEnchant',
    'UniqueMap',
    'Map',
    'UniqueJewel',
    'UniqueFlask',
    'UniqueWeapon',
    'UniqueArmour',
    'UniqueAccessory'
]

const getResourceBySegment = (segment) => (({
    Fragment: 'currencyoverview',
    Currency: 'currencyoverview',
    Oil: 'itemoverview',
    Incubator: 'itemoverview',
    Scarab: 'itemoverview',
    Fossil: 'itemoverview',
    Resonator: 'itemoverview',
    Essence: 'itemoverview',
    DivinationCard: 'itemoverview',
    Prophecy: 'itemoverview',
    SkillGem: 'itemoverview',
    BaseType: 'itemoverview',
    HelmetEnchant: 'itemoverview',
    UniqueMap: 'itemoverview',
    Map: 'itemoverview',
    UniqueJewel: 'itemoverview',
    UniqueFlask: 'itemoverview',
    UniqueWeapon: 'itemoverview',
    UniqueArmour: 'itemoverview',
    UniqueAccessory: 'itemoverview',
})[segment] || null)

export const fetchAllSegments = (league) => {
    const makeUri = segment => `https://poe.ninja/api/data/${getResourceBySegment(segment)}?league=${league}&type=${segment}`
    return Promise.all(Segments.map(
            segment => fetch(makeUri(segment)).then(res => res.json()).then(res => res.lines)
        ))
        .then(results => results.reduce(
            (out, segmentData, index) => {
                const segmentName = Segments[index];
                out[segmentName] = segmentData;
                return out;
            },
            {}
        ))
}