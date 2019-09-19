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
        
    let poeNinjaItems = []
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
        const v = DataSegments[segment].filter(predicate)
        console.log(`Searching segment ${segment}: ${v ? 'found' : 'not found'}`)
        return v
    }

    if (rarity === Rarity.Unique) {
        console.time('findInSegment(UniqueAccessory)')
        poeNinjaItems = findInSegment('UniqueAccessory', isSameUnique)
        console.timeEnd('findInSegment(UniqueAccessory)')
        if (!poeNinjaItems.length) {
            console.time('findInSegment(UniqueArmour)')
            poeNinjaItems = findInSegment('UniqueArmour', isSameUnique)
            console.timeEnd('findInSegment(UniqueArmour)')
        }
        if (!poeNinjaItems.length) {
            console.time('findInSegment(UniqueFlask)')
            poeNinjaItems = findInSegment('UniqueFlask', isSameUnique)
            console.timeEnd('findInSegment(UniqueFlask)')
        }
        if (!poeNinjaItems.length) {
            console.time('findInSegment(UniqueJewel)')
            poeNinjaItems = findInSegment('UniqueJewel', isSameUnique)
            console.timeEnd('findInSegment(UniqueJewel)')
        }
        if (!poeNinjaItems.length) {
            console.time('findInSegment(UniqueMap)')
            poeNinjaItems = findInSegment('UniqueMap', isSameUnique)
            console.timeEnd('findInSegment(UniqueMap)')
        }
        if (!poeNinjaItems.length) {
            console.time('findInSegment(UniqueWeapon)')
            poeNinjaItems = findInSegment('UniqueWeapon', isSameUnique)
            console.timeEnd('findInSegment(UniqueWeapon)')
        }
        // done
    } else if (rarity === Rarity.Currency) {
        console.time('findInSegment(Currency)')
        poeNinjaItems = findInSegment('Currency', isSameCurrency)
        console.timeEnd('findInSegment(Currency)')
        if (!poeNinjaItems.length) {
            console.time('findInSegment(Essence)')
            poeNinjaItems = findInSegment('Essence', isSameName)
            console.timeEnd('findInSegment(Essence)')
        }
        if (!poeNinjaItems.length) {
            console.time('findInSegment(Fossil)')
            poeNinjaItems = findInSegment('Fossil', isSameName)
            console.timeEnd('findInSegment(Fossil)')
        }
        if (!poeNinjaItems.length) {
            console.time('findInSegment(Resonator)')
            poeNinjaItems = findInSegment('Resonator', isSameName)
            console.timeEnd('findInSegment(Resonator)')
        }
        if (!poeNinjaItems.length) {
            console.time('findInSegment(Oil)')
            poeNinjaItems = findInSegment('Oil', isSameBaseType)
            console.timeEnd('findInSegment(Oil)')
        }
    } else if (rarity === Rarity.DivCard) {
        console.time('findInSegment(DivinationCard)')
        poeNinjaItems = findInSegment('DivinationCard', isSameName)
        console.timeEnd('findInSegment(DivinationCard)')
        // done
    } else if (rarity === Rarity.Gem) {
        throw new Error('Gems not implemented yet')
    } else {
        console.time('findInSegment(Fragment)')
        poeNinjaItems = findInSegment('Fragment', isSameName)
        console.timeEnd('findInSegment(Fragment)')
        if (!poeNinjaItems.length) {
            console.time('findInSegment(Incubator)')
            poeNinjaItems = findInSegment('Incubator', isSameName)
            console.timeEnd('findInSegment(Incubator)')
        }
        if (!poeNinjaItems.length) {
            console.time('findInSegment(Prophecy)')
            poeNinjaItems = findInSegment('Prophecy', isSameName)
            console.timeEnd('findInSegment(Prophecy)')
        }
        if (!poeNinjaItems.length) {
            console.time('findInSegment(Scarab)')
            poeNinjaItems = findInSegment('Scarab', isSameName)
            console.timeEnd('findInSegment(Scarab)')
        }
        if (!poeNinjaItems.length) {
            console.time('findInSegment(Map)')
            poeNinjaItems = findInSegment('Map', isSameBaseType)
            console.timeEnd('findInSegment(Map)')
        }
        if (!poeNinjaItems.length) {            
            if (!isNaN(itemLevel)) {
                const sortLevelDesc = (a,b) => b.levelRequired - a.levelRequired
                console.time('DataSegments.BaseType.filter(isSameVariant)')
                poeNinjaItems = DataSegments.BaseType.filter(isSameVariant)
                console.timeEnd('DataSegments.BaseType.filter(isSameVariant)')
                console.time('poeNinjaItems.sort(sortLevelDesc)')
                poeNinjaItems = poeNinjaItems.sort(sortLevelDesc);
                console.timeEnd('poeNinjaItems.sort(sortLevelDesc)')
                // console.time('candidates.find(v => v.levelRequired <= itemLevel)')
                // poeNinjaItems = candidates.find(v => v.levelRequired <= itemLevel)
                // console.timeEnd('candidates.find(v => v.levelRequired <= itemLevel)')
            } else {
                throw new Error('Item is probably BaseType but could not figure out the item level')
            }
        }
    }
    
    return {
        rarity,
        baseType,
        itemName,
        itemLevel,
        variant,
        items: poeNinjaItems
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
    const { items, itemLevel } = data;

    console.time('positionViewAtMouse()')
    positionViewAtMouse('pricecheck');
    console.timeEnd('positionViewAtMouse()')

    console.time('renderItem')

    const itemList = document.querySelector('.item-list');
    const itemTemplate = document.querySelector('.templates .item-template');
    const currencyItemTemplate = document.querySelector('.templates .currency-item-template');
    const itemNotFoundTemplate = document.querySelector('.templates .item-not-found-template');

    itemList.innerHTML = '';

    if (!items.length) {
        itemList.appendChild(itemNotFoundTemplate.cloneNode(true));
        return
    }

    let itemsWithMatchingLevel = items.filter(v => v.levelRequired <= itemLevel)

    items.forEach(item => {
        let itemContainer;
        if (item.currencyTypeName) { // is a currency item
            itemContainer = currencyItemTemplate.cloneNode(true);
            itemContainer.querySelector('.name').innerText = item.currencyTypeName;
            itemContainer.querySelector('.pay').innerText = item.pay ? item.pay.value.toFixed(2) : 'n/a';
            itemContainer.querySelector('.receive').innerText = item.receive ? item.receive.value.toFixed(2) : 'n/a';
            if (item.icon)
                itemContainer.querySelector('.icon').src = item.icon;
            else
                itemContainer.querySelector('.icon').src = '';
        } else {
            itemContainer = itemTemplate.cloneNode(true);
            let displayName = item.baseType
            if (item.name != item.baseType)
                displayName = [item.name, item.baseType].filter(e => e).join(' ')
            itemContainer.querySelector('.name').innerText = displayName;
            itemContainer.querySelector('.chaos-value').innerText = item.chaosValue;

            if (item.icon)
                itemContainer.querySelector('.icon').src = item.icon;
            else
                itemContainer.querySelector('.icon').src = '';

            let variant = 'Normal'
            if (item.variant)
                variant = item.variant
            itemContainer.querySelector('.variant').innerText = variant;

            let levelRequired = 'None'
            let isMatchingItemLevel = true
            if (item.levelRequired) {
                levelRequired = item.levelRequired
                if (itemsWithMatchingLevel.indexOf(item) === -1) {
                    isMatchingItemLevel = false
                }
            }
            itemContainer.querySelector('.required-level').innerText = levelRequired;

            let links = 'None'
            if (item.links)
                links = item.links
            itemContainer.querySelector('.num-links').innerText = links;

            let confidence = 'low'
            if (!item.sparkline.data.length && !item.lowConfidenceSparkline.data.length) {
                confidence = 'none'
            } else if (item.sparkline.data.length) {
                confidence = 'high'
            }
            itemContainer.querySelector('.confidence').innerText = confidence;
        }
        itemList.appendChild(itemContainer);
    })

    console.timeEnd('renderItem')
    // document.getElementById('dump').innerText = JSON.stringify(data, void 0, 4);
}

const hydrateAllSegments = () => fetchAllSegments('Blight').then(d => DataSegments = d)
let fetchAllSegmentsInterval = null;
let doingPriceCheck = false;
window.addEventListener('deaf_coriander-load', () => {
    addShortcut(globalShortcuts.pricecheckItem, () => {
        if (doingPriceCheck) return;
        doingPriceCheck = true;
        console.time('doPriceCheck()')
        doPriceCheck().then(data => {
            console.timeEnd('doPriceCheck()')
            console.time('handlePriceCheckFinished()')
            handlePriceCheckFinished(data)
            doingPriceCheck = false;
            console.timeEnd('handlePriceCheckFinished()')
        }).catch(() => doingPriceCheck = false)
    })
    fetchAllSegmentsInterval = setInterval(hydrateAllSegments, 1000 * 60 * 5)
    hydrateAllSegments()
})
window.addEventListener('deaf_coriander-close', () => {
    if (fetchAllSegmentsInterval) clearInterval(fetchAllSegmentsInterval)
})
