const browser = window.browser;
const numbers = ['¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹'];

var indexDict = { }

// TODO: handle window events?

// window events must also be accounted for
// actions that can change the first tab index of a window
//  the first tab is removed
//  tabs are moved
//  a new tab is created, the next ones should be updated
//  onUpdate? just that tab?

function setFirstIndex(windowId) {
    const firstIndex = browser.tabs
        .query({ windowId: windowId, hidden: false })
        .then((tabs) => {
            return tabs.reduce(
                (prev, cur) => prev.index < cur.index ? prev : cur).index
        }, () => undefined);
    indexDict[windowId] = firstIndex;

    return firstIndex;
}

function getFirstIndex(windowId) {
    const firstIndex = indexDict[windowId];
    if (firstIndex === undefined) {
        return setFirstIndex(windowId);
    }

    return firstIndex
}

// TODO: unfinished
function updateTab(details, ignoreLoading = false) {
    if (ignoreLoading && details.status === "loading") {
        return;
    }

    const relativeIndex = details.index - getFirstIndex(details.windowId);
    if (relativeIndex >= 9) {
        return;
    }

    const newTitle = numbers[relativeIndex] + details.title;
    try {
        browser.tabs.executeScript(
            details.id, { code: `document.title = ${JSON.stringify()}` }
        )
    } catch (e) {
        console.error(e);
    }
}

function updateWindow(windowId) {
    browser.tabs
        .query({ windowId: windowId, hidden: false })
        .then((tabs) => tabs.forEach(updateTab));
}

function handleRemoved(tabId, removeInfo) {
    console.log(tabId);
    console.log(removeInfo);
}

browser.tabs.onCreated.addListener(()=>{});
browser.tabs.onMoved.addListener(()=>{});
browser.tabs.onRemoved.addListener(handleRemoved);
browser.tabs.onUpdated.addListener(function(_, _, tab) {
    updateTab(tab);
});

// browser.windows.onRemoved.addListener(handleWindowRemoved);
// browser.windows.onCreated.addListener(handleWindowCreated);

console.log("Loaded");

// browser.tabs
//     .query({windowId: 1, hidden: false})
//     .then((tabs) => {
//         for (const tab of tabs) {
//             console.log(tab);
//         }
//     });

browser.windows
    .getAll()
    .then((windows) => {
        for (const window of windows) {
            if (window.type != "normal") continue;
            // updateWindow(window.id);
            setFirstIndex(window.id);
        }
        console.log(indexDict);
    });
