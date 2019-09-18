const {
    require,
    addShortcut,
    globalShortcuts,
    positionViewAtMouse,
    readClipboard,
    remoteLog,
    views
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

    const socketGroups = itemLines.find(line => line.startsWith('Sockets: '))
    let hasSockets = false
    let numSockets = 0
    let numLinks = 0
    if (socketGroups) {
        hasSockets = true
        if (socketGroups.length === 1) numSockets = 1
        else numSockets = socketGroups.length/2+1
        numSockets = socketGroups.split('').filter(s => s !== '-').length;
        let currentLinks = 1
        let highestLinks = 1
        for (let i = 0; i < numSockets-1; i++) {
            if (socketGroups[i] === '-') {
                currentLinks++;
            }
            if (currentLinks > numLinks) numLinks = currentLinks;
        }
        numLinks = highestLinks
    }
        
    let poeNinjaItem = null
    // whether the item is from the itemoverview or the currencyoverview
    // endpoint as these have different fields available
    let isCurrencyItem = false
    
    const isSameName = v => v.name === baseType
    const isSameBaseType = v => v.baseType === baseType
    const isSameCurrency = v => v.currencyTypeName === baseType
    const isSameUnique = v => {
        const isSameBase = v.baseType === baseType && v.name === itemName
        return isSameBase;
        // fix this, numLinks is always 1 or something
        if (isSameBase)
            console.log({ isSameBase, baseType, itemName, variant, hasSockets, numLinks, v })
        return hasSockets && v.links !== 0 ? (isSameBase && v.links == numLinks) : isSameBase;
    }
    const isSameVariant = v => {
        const isSameBase = baseType.indexOf(v.baseType) !== -1 && variant === v.variant;
        return isSameBase;
        // fix this, numLinks is always 1 or something
        if (isSameBase && itemName === "Tabula Rasa") return true // poe.ninja says it only has 1 link -.-
        if  (isSameBase)
            console.log({ isSameBase, baseType, variant, hasSockets, numLinks, v })
        return hasSockets && v.links !== 0 ? (isSameBase && v.links == numLinks) : isSameBase;
    }

    const findInSegment = (segment, predicate) => {
        const v = DataSegments[segment].find(predicate)
        console.log(`Searching segment ${segment}: ${v ? 'found' : 'not found'}`)
        return v
    }

    if (rarity === Rarity.Unique) {
        console.time('findInSegment(UniqueAccessory)')
        poeNinjaItem = findInSegment('UniqueAccessory', isSameUnique)
        console.timeEnd('findInSegment(UniqueAccessory)')
        if (!poeNinjaItem) {
            console.time('findInSegment(UniqueArmour)')
            poeNinjaItem = findInSegment('UniqueArmour', isSameUnique)
            console.timeEnd('findInSegment(UniqueArmour)')
        }
        if (!poeNinjaItem) {
            console.time('findInSegment(UniqueFlask)')
            poeNinjaItem = findInSegment('UniqueFlask', isSameUnique)
            console.timeEnd('findInSegment(UniqueFlask)')
        }
        if (!poeNinjaItem) {
            console.time('findInSegment(UniqueJewel)')
            poeNinjaItem = findInSegment('UniqueJewel', isSameUnique)
            console.timeEnd('findInSegment(UniqueJewel)')
        }
        if (!poeNinjaItem) {
            console.time('findInSegment(UniqueMap)')
            poeNinjaItem = findInSegment('UniqueMap', isSameUnique)
            console.timeEnd('findInSegment(UniqueMap)')
        }
        if (!poeNinjaItem) {
            console.time('findInSegment(UniqueWeapon)')
            poeNinjaItem = findInSegment('UniqueWeapon', isSameUnique)
            console.timeEnd('findInSegment(UniqueWeapon)')
        }
        // done
    } else if (rarity === Rarity.Currency) {
        console.time('findInSegment(Currency)')
        poeNinjaItem = findInSegment('Currency', isSameCurrency)
        console.timeEnd('findInSegment(Currency)')
        isCurrencyItem = true
        if (!poeNinjaItem) {
            console.time('findInSegment(Essence)')
            poeNinjaItem = findInSegment('Essence', isSameName)
            console.timeEnd('findInSegment(Essence)')
            isCurrencyItem = false
        }
        if (!poeNinjaItem) {
            console.time('findInSegment(Fossil)')
            poeNinjaItem = findInSegment('Fossil', isSameName)
            console.timeEnd('findInSegment(Fossil)')
        }
        if (!poeNinjaItem) {
            console.time('findInSegment(Resonator)')
            poeNinjaItem = findInSegment('Resonator', isSameName)
            console.timeEnd('findInSegment(Resonator)')
        }
        if (!poeNinjaItem) {
            console.time('findInSegment(Oil)')
            poeNinjaItem = findInSegment('Oil', isSameBaseType)
            console.timeEnd('findInSegment(Oil)')
        }
    } else if (rarity === Rarity.DivCard) {
        console.time('findInSegment(DivinationCard)')
        poeNinjaItem = findInSegment('DivinationCard', isSameName)
        console.timeEnd('findInSegment(DivinationCard)')
        // done
    } else if (rarity === Rarity.Gem) {
        throw new Error('Gems not implemented yet')
    } else {
        console.time('findInSegment(Fragment)')
        poeNinjaItem = findInSegment('Fragment', isSameName)
        console.timeEnd('findInSegment(Fragment)')
        isCurrencyItem = true
        if (!poeNinjaItem) {
            isCurrencyItem = false
            console.time('findInSegment(Incubator)')
            poeNinjaItem = findInSegment('Incubator', isSameName)
            console.timeEnd('findInSegment(Incubator)')
        }
        if (!poeNinjaItem) {
            console.time('findInSegment(Prophecy)')
            poeNinjaItem = findInSegment('Prophecy', isSameName)
            console.timeEnd('findInSegment(Prophecy)')
        }
        if (!poeNinjaItem) {
            console.time('findInSegment(Scarab)')
            poeNinjaItem = findInSegment('Scarab', isSameName)
            console.timeEnd('findInSegment(Scarab)')
        }
        if (!poeNinjaItem) {
            console.time('findInSegment(Map)')
            poeNinjaItem = findInSegment('Map', isSameBaseType)
            console.timeEnd('findInSegment(Map)')
        }
        if (!poeNinjaItem) {            
            if (!isNaN(itemLevel)) {
                const sortLevelDesc = (a,b) => b.levelRequired - a.levelRequired
                console.time('DataSegments.BaseType.filter(isSameVariant)')
                let candidates = DataSegments.BaseType.filter(isSameVariant)
                console.timeEnd('DataSegments.BaseType.filter(isSameVariant)')
                console.time('candidates.sort(sortLevelDesc)')
                candidates = candidates.sort(sortLevelDesc);
                console.timeEnd('candidates.sort(sortLevelDesc)')
                console.log({ candidates });
                console.time('candidates.find(v => v.levelRequired <= itemLevel)')
                poeNinjaItem = candidates.find(v => v.levelRequired <= itemLevel)
                console.timeEnd('candidates.find(v => v.levelRequired <= itemLevel)')
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

const wasteCpuCyclesForMilliseconds = (ms = 1) => {
    // setTimeout does not work reliably in inactive windows
    // we just need to spend some time to wait for the OS to do certain things
    // like copy something to the clipboard or show the window we want
    const t = Date.now();
    for(;;) if(Date.now()-t>=ms) break;
}

const doPriceCheck = (options = {}) => new Promise((resolve, reject) => {
    const defVal = (x, d) => typeof x === 'undefined' ? d : x
    const forceShowWindow = defVal(options.forceShowWindow, true)
    const windowShowWaitTime = defVal(options.windowShowWaitTime, 1)
    const clipboardCopyWaitTime = defVal(options.clipboardCopyWaitTime, 5)
    if (!DataSegments) {
        return reject('[priceCheckHandler] poe.ninja data not loaded yet')
    }

    console.time('setWindowActive()')
    if (!isWindowActive() && forceShowWindow) setWindowActive()
    console.timeEnd('setWindowActive()')

    console.time('setTimeout(windowShowWaitTime)')
    wasteCpuCyclesForMilliseconds(windowShowWaitTime)
    console.timeEnd('setTimeout(windowShowWaitTime)')

    console.time('sendCtrlC')
    if (!sendCtrlC()) reject('[priceCheckHandler] Sending ctrl+c failed')
    console.timeEnd('sendCtrlC')

    console.time('setTimeout(clipboardCopyWaitTime)')
    wasteCpuCyclesForMilliseconds(clipboardCopyWaitTime)
    console.timeEnd('setTimeout(clipboardCopyWaitTime)')
    
    try {
        console.time('resolve(evaluateClipboard())')
        resolve(evaluateClipboard())
        console.timeEnd('resolve(evaluateClipboard())')
    } catch(e) {
        reject(e)
    }
})

const handlePriceCheckFinished = data => {
    const {
        item,
        isCurrencyItem
    } = data;

    console.time('positionViewAtMouse()')
    positionViewAtMouse('pricecheck');
    console.timeEnd('positionViewAtMouse()')

    if (!item) {
        document.querySelector('.currency-item').style.display = 'none';
        document.querySelector('.item').style.display = 'none';
        document.querySelector('.item-not-found').style.display = 'flex';
        return
    }

    if (isCurrencyItem) {
        document.querySelector('.currency-item').style.display = 'flex';
        document.querySelector('.item').style.display = 'none';
        document.querySelector('.item-not-found').style.display = 'none';

        document.getElementById('currency-item-name').innerText = item.currencyTypeName;
        document.querySelector('.currency-item-price-pay').innerText = item.pay ? item.pay.value.toFixed(2) : 'n/a';
        document.querySelector('.currency-item-price-receive').innerText = item.receive ? item.receive.value.toFixed(2) : 'n/a';
        
        if (item.icon) {
            document.getElementById('currency-item-icon').src = item.icon;
        } else {
            document.getElementById('currency-item-icon').src = '';
        }
    } else {
        document.querySelector('.currency-item').style.display = 'none';
        document.querySelector('.item').style.display = 'flex';
        document.querySelector('.item-not-found').style.display = 'none';

        document.getElementById('item-name').innerText = [item.name, item.baseType].filter(e => e).join(' ');
        document.getElementById('chaos-value').innerText = item.chaosValue;
        if (item.icon) {
            document.getElementById('item-icon').src = item.icon;
        } else {
            document.getElementById('item-icon').src = '';
        }
        if (item.variant)
            document.getElementById('item-variant').innerText = item.variant;
        if (item.requiredLevel)
            document.getElementById('item-required-level').innerText = item.requiredLevel;
    }
    document.getElementById('dump').innerText = JSON.stringify(data, void 0, 4);
}

const hydrateAllSegments = () => fetchAllSegments('Blight').then(d => DataSegments = d)
let fetchAllSegmentsInterval = null
window.addEventListener('deaf_coriander-load', () => {
    addShortcut(globalShortcuts.pricecheckItem, () => {
        console.time('doPriceCheck()')
        doPriceCheck().then(data => {
            console.timeEnd('doPriceCheck()')
            console.time('handlePriceCheckFinished()')
            handlePriceCheckFinished(data)
            console.timeEnd('handlePriceCheckFinished()')
        })
    })
    fetchAllSegmentsInterval = setInterval(hydrateAllSegments, 1000 * 60 * 5)
    hydrateAllSegments()
    alert('loaded')
    let dumpToggled = false;
    document.getElementById('show-debug-info').addEventListener('click', () =>
        document.getElementById('dump').style.display = dumpToggled ? 'none' : 'initial'
    );
})
window.addEventListener('deaf_coriander-close', () => {
    if (fetchAllSegmentsInterval) clearInterval(fetchAllSegmentsInterval)
})
