const browser = window.browser;
const numbers = ['¹','²','³','⁴','⁵','⁶','⁷','⁸'];
const maxNumbers = 8;

var indexDict = { }

// TODO: tab navigation using (ctrl,mod,others)

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
            console.log(tabs);
        });
}

// what use of having tabId if can't be queried because it's already removed?
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

// doesn't work if title of tab contains char in numbers
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

// test
console.log("Load{test}");
browser.windows
    .getAll()
    .then((windows) => {
        for (const window of windows) {
            if (window.type != "normal") continue;
            setFirstIndex(window.id);
            updateWindow(window.id);
        }
    });
