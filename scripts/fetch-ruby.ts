async function fetchRuby() {
    const res = await fetch("https://raw.githubusercontent.com/douglara/digisac/master/lib/digisac/messages.rb");
    console.log(await res.text());
}
fetchRuby();
