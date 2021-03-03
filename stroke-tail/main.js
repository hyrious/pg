const $ = sel => document.querySelector(sel)
let canvas = $('#app')
let ctx = canvas.getContext('2d')
ctx.lineJoin = "round"
ctx.lineCap = "round"
ctx.miterLimit = 100
let drawing = false
let path = []
let last = null

function mousedown() {
    drawing = true
    path = []
    last = null
}

function mouseup() {
    drawing = false
}

function drag({ x, y }) {
    if (last?.x !== x || last?.y !== y) {
        last = { x, y, w: 0 }
        path.push(last)
        refresh()
    }
}

function add(p1, p2) {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
}

function sub(p1, p2) {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
}

function mul(p1, r) {
    return { x: p1.x * r, y: p1.y * r };
}

function div(p1, r) {
    if (r < 1e-6) return { x: 0, y: 0 };
    return { x: p1.x / r, y: p1.y / r };
}

function length(p1) {
    return Math.hypot(p1.x, p1.y);
}

function normalize(p1) {
    return div(p1, length(p1));
}

function distance(p1, p2) {
    return length(sub(p1, p2));
}

function rot90(p1) {
    return { x: p1.y, y: -p1.x };
}

function refresh() {
    if (path.length < 2) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.beginPath()
    const stack = []
    let cx, cy, s = false;
    for (let i = 0; i < path.length; ++i) {
        const { w } = path[i]
        let tan
        if (i === 0) {
            tan = sub(path[i + 1], path[i])
        } else if (i === path.length - 1) {
            tan = sub(path[i], path[i - 1])
        } else {
            tan = add(
                normalize(sub(path[i], path[i - 1])),
                normalize(sub(path[i + 1], path[i])),
            )
        }
        tan = mul(normalize(rot90(tan)), w)
        const p = sub(path[i], tan)
        if (i === 0) {
            ctx.moveTo(p.x, p.y)
        } else if (i % 2 !== 0) {
            s = true
            cx = p.x, cy = p.y
        } else {
            s = false
            ctx.quadraticCurveTo(cx, cy, p.x, p.y)
        }
        stack.push(add(path[i], tan))
    }
    for (let p; p = stack.pop();) {
        if (s) {
            s = false
            cx = p.x, cy = p.y
        } else {
            s = true
            ctx.quadraticCurveTo(cx, cy, p.x, p.y)
        }
    }
    ctx.closePath();
    ctx.fill()
}

canvas.onmousedown = mousedown
canvas.onmouseup = mouseup
canvas.onmouseleave = mouseup
canvas.onmousemove = (e) => {
    if (drawing) {
        const { left, top } = e.target.getBoundingClientRect()
        const { clientX, clientY } = e
        drag({ x: clientX - left, y: clientY - top })
    }
}

function update() {
    requestAnimationFrame(update)
    if (drawing) {
        path.forEach(p => { p.w = Math.min(p.w + 1, 3) })
    }
}
update()
