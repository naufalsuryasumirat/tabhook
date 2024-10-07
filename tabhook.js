const browser = window.browser;
const numbers = ['¹','²','³','⁴','⁵','⁶','⁷','⁸'];
const maxNumbers = 8;

var indexDict = { }

// TODO: buggy, incorrent with some hidden tabs
//  if [0,2] is visible, but [1] is hidden
//  if it were to change, couldn't use indexDict
async function setFirstIndex(windowId) {
    const firstIndex = await browser.tabs
        .query({ windowId: windowId, hidden: false })
        .then((tabs) => {
            return tabs.reduce(
                (prev, cur) => prev.index < cur.index ? prev : cur).index
        }, console.error);
    indexDict[windowId] = firstIndex;

    return firstIndex;
}

function getFirstIndex(windowId) {
    const firstIndex = indexDict[windowId];
    if (firstIndex === undefined) {
        return setFirstIndex(windowId);
    }

    return firstIndex;
}

function getLastId(windowId) {
    const lastIndex = browser.tabs
        .query({ windowId: windowId, hidden: false })
        .then((tabs) => {
            return tabs.reduce(
                (prev, cur) => prev.index < cur.index ? cur : prev
            ).id;
        }, console.error);

    return lastIndex;
}

function removeTabNumber(tab) {
    browser.tabs.executeScript(
        tab.id,
        { code: `document.title = ${JSON.stringify(tab.title.substring(1))}` })
        .catch((err) => console.error(err));
}

function updateTab(tab, ignoreNumbered = true, ignoreLoading = false) {
    const alreadyNumbered = numbers.includes(tab.title[0]);
    if (tab.hidden && alreadyNumbered) {
        removeTabNumber(tab);
        return;
    }

    if (tab.hidden
        || (ignoreNumbered && alreadyNumbered)
        || (ignoreLoading && tab.status === "loading")) {
        return;
    }

    const relativeIndex = tab.index - getFirstIndex(tab.windowId);
    if (relativeIndex > maxNumbers && !alreadyNumbered) {
        return;
    }

    let newTitle = (numbers[relativeIndex] || "")
        + (alreadyNumbered ? tab.title.substring(1) : tab.title);

    browser.tabs.executeScript(
        tab.id,
        { code: `document.title = ${JSON.stringify(newTitle)}` })
        .catch((err) => console.error(err));
}

function updateWindow(windowId, startId = 0, ignoreNumbered = true) {
    browser.tabs
        .query({ windowId: windowId, hidden: false })
        .then((tabs) => {
            for (let tab of tabs) {
                if (tab.index < startId) continue;
                updateTab(tab, ignoreNumbered);
            }
        });
}

function handleRemoved(_, removeInfo) {
    if (removeInfo.isWindowClosing) {
        return;
    }

    updateWindow(removeInfo.windowId, 0, false);
}

function handleMoved(_, moveInfo) {
    const minIndex = Math.min(moveInfo.fromIndex, moveInfo.toIndex);
    updateWindow(moveInfo.windowId, minIndex, false);
}

function handleCreated(tab) {
    updateWindow(tab.windowId, tab.index, false);
}

function handleUpdated(_, _, tab) {
    if (tab.hidden) return;
    updateTab(tab);
}

function handleVisibilityUpdated(_, changeInfo, tab) {
    if (changeInfo.pinned) {
        updateWindow(tab.windowId);
        return;
    }

    // previously visible, now hidden
    const wid = tab.windowId;
    setFirstIndex(wid);
    if (changeInfo.hidden) {
        updateTab(tab);
    }
    updateWindow(wid, 0, false);
}

function handleDetached(tabId, detachInfo) {
    setFirstIndex(detachInfo.oldWindowId);
    updateWindow(detachInfo.oldWindowId, detachInfo.oldPosition, false);
    browser.tabs
        .get(tabId)
        .then((tab) => updateTab(tab))
        .catch(console.error);
}

function handleAttached(_, attachInfo) {
    setFirstIndex(attachInfo.newWindowId);
    updateWindow(attachInfo.newWindowId, attachInfo.newPosition, false);
}

// basic tab operations
browser.tabs.onCreated.addListener(handleCreated);
browser.tabs.onMoved.addListener(handleMoved);
browser.tabs.onRemoved.addListener(handleRemoved);

// most likely still incorrect
browser.tabs.onDetached.addListener(handleDetached);
browser.tabs.onAttached.addListener(handleAttached);

const filterTitle = { properties: ["title"] };
const filterVisibility = { properties: ["hidden", "pinned"] };
browser.tabs.onUpdated.addListener(handleUpdated, filterTitle);
browser.tabs.onUpdated.addListener(handleVisibilityUpdated, filterVisibility);

function handleWindowCreated(windowId) {
    setFirstIndex(windowId);
}

function handleWindowRemoved(windowId) {
    if (indexDict[windowId] === undefined) return;
    delete indexDict[windowId];
}

browser.windows.onRemoved.addListener(handleWindowRemoved);
browser.windows.onCreated.addListener(handleWindowCreated);

browser.windows
    .getAll()
    .then((windows) => {
        for (const window of windows) {
            if (window.type != "normal") continue;
            setFirstIndex(window.id);
            updateWindow(window.id);
        }
    });

// keyboard commands
// pretty funny function name, I must say
//  this breaks if the logic upstairs is incorrect
async function getHooked(windowId, index) {
    const hooked = await browser.tabs
        .query({
            windowId: windowId,
            index: getFirstIndex(windowId) + index })
        .then(function(tabs) {
            if (!tabs.length) return getLastId(windowId);
            return tabs[0].id;
        })
        .catch((err) => { console.error(err); });

    return hooked;
}

async function hookTab(current, destination) {
    const hookedId = await getHooked(current.windowId, destination);
    browser.tabs.update(
        hookedId,
        { active: true });
}

function handleCommands(name, tab) {
    switch (name) {
    case "hook-1":
        hookTab(tab, 0);
        break;
    case "hook-2":
        hookTab(tab, 1);
        break;
    case "hook-3":
        hookTab(tab, 2);
        break;
    case "hook-4":
        hookTab(tab, 3);
        break;
    case "hook-5":
        hookTab(tab, 4);
        break;
    case "hook-6":
        hookTab(tab, 5);
        break;
    case "hook-7":
        hookTab(tab, 6);
        break;
    case "hook-8":
        hookTab(tab, 7);
        break;
    }
}

browser.commands.onCommand.addListener(handleCommands);
