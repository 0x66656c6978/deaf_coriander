const {
    require,
    addShortcut,
    globalShortcuts,
    positionViewAtMouse,
    readClipboard,
    remoteLog
} = window.bridge

const { fetchAllSegments } = require('lib/poe-ninja')
const { isWindowActive, setWindowActive, sendCtrlC } = require('lib/game')

let DataSegments = null

const Rarity = {
    Normal: 'Normal',
    Magic: 'Magic',
    Rare: 'Rare',
    Unique: 'Unique',
    Currency: 'Currency',
    DivCard: 'Divination Card',
    Gem: 'Gem'
}

const evaluateClipboard = () => {
    const clipboardText = readClipboard()
    const itemLines = clipboardText.replace(/\r/g, '').split('\n')

    const rarity = itemLines[0].split('Rarity: ')[1]
    if (!rarity) return
    let baseType = itemLines[1]
    let itemName = null
    let variant = null
    let itemLevel = null

    if (rarity === Rarity.Rare || rarity === Rarity.Unique) {
        itemName = itemLines[1]
        baseType = itemLines[2]
    }

    let itemLevelLine = itemLines.find(line => line.startsWith('Item Level: '));
    if (itemLevelLine) {
        itemLevel = parseInt(itemLevelLine.split('Item Level: ')[1], 10);
    }

    if (itemLines.filter(line => line === 'Unidentified').length >= 1) {
        throw new Error('Item is unidentified')
    }

    if (itemLines.filter(line => line === 'Shaper Item').length >= 1) {
        variant = 'Shaper'
    } else if (itemLines.filter(line => line === 'Elder Item').length >= 1) {
        variant = 'Elder'
    } else if (itemLines.filter(line => line === 'Fractured Item').length >= 1) {
        variant = 'Fractured'
    } else if (baseType.indexOf('Blighted') !== -1) {
        variant = 'Blight'
    }

    let poeNinjaItem = null
    // whether the item is from the itemoverview or the currencyoverview
    // endpoint as these have different fields available
    let isCurrencyItem = false

    const isSameName = v => v.name === baseType
    const isSameBaseType = v => v.baseType === baseType
    const isSameCurrency = v => v.currencyTypeName === baseType
    const isSameUnique = v => v.baseType === baseType && v.name === itemName
    const isSameVariant = v => baseType.indexOf(v.baseType) !== -1 && variant === v.variant

    const findInSegment = (segment, predicate) => {
        const v = DataSegments[segment].find(predicate)
        console.log(`Searching segment ${segment}: ${v ? 'found' : 'not found'}`)
        return v
    }

    if (rarity === Rarity.Unique) {
        poeNinjaItem = findInSegment('UniqueAccessory', isSameUnique)
        if (!poeNinjaItem) {
            poeNinjaItem = findInSegment('UniqueArmour', isSameUnique)
        }
        if (!poeNinjaItem) {
            poeNinjaItem = findInSegment('UniqueFlask', isSameUnique)
        }
        if (!poeNinjaItem) {
            poeNinjaItem = findInSegment('UniqueJewel', isSameUnique)
        }
        if (!poeNinjaItem) {
            poeNinjaItem = findInSegment('UniqueMap', isSameUnique)
        }
        if (!poeNinjaItem) {
            poeNinjaItem = findInSegment('UniqueWeapon', isSameUnique)
        }
        // done
    } else if (rarity === Rarity.Currency) {
        poeNinjaItem = findInSegment('Currency', isSameCurrency)
        isCurrencyItem = true
        if (!poeNinjaItem) {
            poeNinjaItem = findInSegment('Essence', isSameName)
            isCurrencyItem = false
        }
        if (!poeNinjaItem) {
            poeNinjaItem = findInSegment('Fossil', isSameName)
        }
        if (!poeNinjaItem) {
            poeNinjaItem = findInSegment('Resonator', isSameName)
        }
        if (!poeNinjaItem) {
            poeNinjaItem = findInSegment('Oil', isSameBaseType)
        }
    } else if (rarity === Rarity.DivCard) {
        poeNinjaItem = findInSegment('DivinationCard', isSameName)
        // done
    } else if (rarity === Rarity.Gem) {
        throw new Error('Gems not implemented yet')
    } else {
        poeNinjaItem = findInSegment('Fragment', isSameName)
        isCurrencyItem = true
        if (!poeNinjaItem) {
            isCurrencyItem = false
            poeNinjaItem = findInSegment('Incubator', isSameName)
        }
        if (!poeNinjaItem) {
            poeNinjaItem = findInSegment('Prophecy', isSameName)
        }
        if (!poeNinjaItem) {
            poeNinjaItem = findInSegment('Scarab', isSameName)
        }
        if (!poeNinjaItem) {
            poeNinjaItem = findInSegment('Map', isSameBaseType)
        }
        if (!poeNinjaItem) {            
            if (!isNaN(itemLevel)) {
                const sortLevelAsc = (a,b) => b.levelRequired - a.levelRequired
                let candidates = d.BaseType.filter(isSameVariant).sort(sortLevelAsc)
                poeNinjaItem = candidates.find(v => v.levelRequired <= itemLevel)
            } else {
                throw new Error('Item is probably BaseType but could not figure out the item level')
            }
        }
    }
    
    return {
        rarity,
        baseType,
        itemName,
        variant,
        isCurrencyItem,
        item: poeNinjaItem
    }
};

const doPriceCheck = (options = {}) => new Promise((resolve, reject) => {
    const defVal = (x, d) => typeof x === 'undefined' ? d : x
    const forceShowWindow = defVal(options.forceShowWindow, true)
    const windowShowWaitTime = defVal(options.windowShowWaitTime, 100)
    const clipboardCopyWaitTime = defVal(options.clipboardCopyWaitTime, 100)
    if (!DataSegments) {
        return reject('[priceCheckHandler] poe.ninja data not loaded yet')
    }
    if (!isWindowActive() && forceShowWindow) setWindowActive()
    setTimeout(() => {
        if (!sendCtrlC()) reject('[priceCheckHandler] Sending ctrl+c failed')
        setTimeout(() => {
            try {
                resolve(evaluateClipboard())
            } catch(e) {
                reject(e)
            }
        }, windowShowWaitTime)
    }, clipboardCopyWaitTime)
})

const handlePriceCheckFinished = (data) => {
    const {
        item,
        isCurrencyItem
    } = data

    positionViewAtMouse('pricecheck')

    let exaltedValue = item.exaltedValue
    let chaosValue = item.chaosValue
    let name = item.baseType

    if (isCurrencyItem) {
        chaosValue = item.chaosEquivalent
        exaltedValue = 'not calculated'
        name = item.currencyTypeName
    }

    document.getElementById('item-name').innerText = name
    document.getElementById('chaos-value').innerText = chaosValue
    if (item.icon)
        document.getElementById('item-icon').src = item.icon
    document.getElementById('dump').innerText = JSON.stringify(data, void 0, 4)
}

const hydrateAllSegments = fetchAllSegments('Blight').then(d => DataSegments = d)
let fetchAllSegmentsInterval = null
window.addEventListener('deaf_coriander-load', () => {
    addShortcut(globalShortcuts.pricecheckItem, () => doPriceCheck().then(handlePriceCheckFinished))
    fetchAllSegmentsInterval = setInterval(hydrateAllSegments, 1000 * 60 * 5)
    hydrateAllSegments()
})
window.addEventListener('deaf_coriander-close', () => {
    if (fetchAllSegmentsInterval) clearInterval(fetchAllSegmentsInterval)
})
