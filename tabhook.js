const browser = window.browser || window.chrome

function testOnMoved() {
    console.log("moved")
}

function testOnRemoved() {
    console.log("removed")
}

browser.tabs.onMoved.addListener(testOnMoved)
browser.tabs.onRemoved.addListener(testOnRemoved)
browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    console.log(tab)
})

console.log("loaded")
