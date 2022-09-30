import { merge, addHandle, removeHandle } from './util'

class ViewBox {
  constructor(opt) {
    this.config = {
      scale: 16 / 9,
      el: document.querySelector('.view-box-roi'),
      config: {},
      width: 320,
      height: 180,
      maxWidth: 0,
      maxHeight: 0,
      circleSize: 8,
      parentEl: document.querySelector('.lbi-svg-box-wrapper'),
      onChange: () => {}
    }
    this.config = merge(this.config, opt)
    this.isDrag = false
    this.isInCircle = false
    this.x = 0
    this.y = 0
    this.styleTop = 0
    this.styleLeft = 0
    this.elWidth = 0
    this.elHeight = 0
    this.circleEl = null

    this.init()
  }

  init() {
    this.loadStyle()
    this.renderUI()
    this.bindEvt()
    this.initElSizePos()
  }

  initElSizePos() {
    const { config } = this.config
    if (!Object.keys(config).length) return

    const { w, h, x, y } = config
    this.setSize(w, h)
    this.setPos(y, x)
    this.config.onChange(false, w, h, x, y)
  }

  renderUI() {
    const { el } = this.config
    let uiDiv = el.querySelector('.view-box-container')

    if (!uiDiv) {
      uiDiv = document.createElement('div')
      uiDiv.className = 'view-box-container'
    }

    let circleHtml = ''
    const max = 8
    const funcList = [
      'topLeft',
      'topCenter',
      'topRight',
      'centerRight',
      'bottomRight',
      'bottomCenter',
      'bottomLeft',
      'centerLeft'
    ]

    for (let i = 0; i < max; i++) {
      circleHtml += '<span class="circle_point circle_point_'+ (i + 1) +'" data-func="'+ funcList[i] +'"></span>'
    }

    uiDiv.innerHTML = circleHtml
    el.appendChild(uiDiv)
    this.config.rootEl = uiDiv

    const { maxWidth, maxHeight, width, height } = this.config
    const w = width / maxWidth
    const h = height / maxHeight
    const top = (1 - h) / 2
    const left = (1 - w) / 2

    this.setSize(w, h)
    this.setPos(top, left)
  }

  setSize(w, h) {
    const el = this.config.el.querySelector('.view-box-container')
    el.style.width = w * 100 + '%'
    el.style.height = h * 100 + '%'
    el.dataset.width = w
    el.dataset.height = h
  }

  setPos(top, left) {
    const el = this.config.el.querySelector('.view-box-container')
    el.dataset.left = left
    el.dataset.top = top
    el.style.top = top * 100 + '%'
    el.style.left = left * 100 + '%'
  }

  getElPos() {
    const el = this.config.el.querySelector('.view-box-container')
    const x = Number(el.dataset.left)
    const y = Number(el.dataset.top)
    const w = Number(el.dataset.width)
    const h = Number(el.dataset.height)

    return {
      x,
      y,
      w,
      h
    }
  }

  //  加载对应样式
  loadStyle() {
    let style = document.querySelector('.view-box')

    if (!style) {
      style = document.createElement('style')
      style.className = 'view-box'
    }

    let circleSize = this.config.circleSize
    let distance = circleSize / 2

    let styleStr = `
      .circle_point {
        width: ${circleSize}px;
        height: ${circleSize}px;
        border-radius: 100%;
        background: #fff;
        position: absolute;
        // display: none;
      }
      .circle_point_1 {
        top: 0;
        left: 0;
        margin-left: -${distance}px;
        margin-top: -${distance}px;
      }
      .circle_point_1:hover {
        cursor: nwse-resize;
      }
      .circle_point_2 {
        top: 0;
        left: 50%;
        margin-left: -${distance}px;
        margin-top: -${distance}px;
      }
      .circle_point_2:hover {
        cursor: ns-resize;
      }
      .circle_point_3 {
        top: 0;
        right: 0;
        margin-right: -${distance}px;
        margin-top: -${distance}px;
      }
      .circle_point_3:hover {
        cursor: nesw-resize;
      }
      .circle_point_4 {
        top: 50%;
        right: 0;
        margin-right: -${distance}px;
        margin-top: -${distance}px;
      }
      .circle_point_4:hover {
        cursor: ew-resize;
      }
      .circle_point_5 {
        bottom: 0;
        right: 0;
        margin-right: -${distance}px;
        margin-bottom: -${distance}px;
      }
      .circle_point_5:hover {
        cursor: nwse-resize;
      }
      .circle_point_6 {
        bottom: 0;
        right: 50%;
        margin-right: -${distance}px;
        margin-bottom: -${distance}px;
      }
      .circle_point_6:hover {
        cursor: ns-resize;
      }
      .circle_point_7 {
        bottom: 0;
        left: 0;
        margin-left: -${distance}px;
        margin-bottom: -${distance}px;
      }
      .circle_point_7:hover {
        cursor: nesw-resize;
      }
      .circle_point_8 {
        top: 50%;
        left: 0;
        margin-left: -${distance}px;
        margin-top: -${distance}px;
      }
      .circle_point_8:hover {
        cursor: ew-resize;
      }
      .view-box-container {
        cursor: move;
        position: absolute;
        border: rgba(71, 118, 241, 0.6);
        background: rgba(71, 118, 241, 0.4);
      }
    `
    style.innerHTML = styleStr
    document.querySelector('head').appendChild(style)
  }

  bindEvt() {
    const { rootEl, parentEl } = this.config

    addHandle(rootEl, 'mousedown', this.wrapperMousedown.bind(this))
    addHandle(rootEl, 'mousemove', this.wrapperMousemove.bind(this))
    addHandle(parentEl, 'mousemove', this.circleMousemove.bind(this))
    
    addHandle(rootEl, 'mouseup', this.wrapperMouseup.bind(this))
    addHandle(document.body, 'mouseup', this.wrapperMouseup.bind(this))

    // const circlePointList = rootEl.querySelector('.circle_point')

    // for (let i = 0; i < circlePointList.length; i++) {
    //   const el = circlePointList[i]

    //   addHandle(el, 'mousedown', this.circleMousedown.bind(this))
    //   addHandle(el, 'mousemove', this.circleMousemove.bind(this))
    //   addHandle(el, 'mouseup', this.circleMouseup.bind(this))
    // }
  }

  removeEvt() {
    const { rootEl } = this.config

    if (!rootEl) return

    removeHandle(rootEl, 'mousedown', this.wrapperMousedown)
    removeHandle(rootEl, 'mousemove', this.wrapperMousemove)
    removeHandle(rootEl, 'mouseup', this.wrapperMouseup)
    addHandle(document.body, 'mouseup', this.wrapperMouseup)
  }

  wrapperMousedown(e) {
    e.stopPropagation()
    const { rootEl } = this.config
    this.x = e.pageX
    this.y = e.pageY
    this.styleTop = Number(rootEl.dataset.top)
    this.styleLeft = Number(rootEl.dataset.left)
    this.elWidth = Number(rootEl.dataset.width)
    this.elHeight = Number(rootEl.dataset.height)

    //  进入的是点位元素
    if (e.target !== rootEl) {
      console.log('wrapperMousedown isInCircle')
      this.isInCircle = true
      this.circleEl = e.target

      return
    }
    
    //  进入父元素
    this.isDrag = true
  }

  wrapperMousemove(e) {
    const x = e.pageX
    const y = e.pageY
    const { maxWidth, maxHeight } = this.config
    const width = this.elWidth
    const height = this.elHeight
    const styleLeft = Number(this.styleLeft)
    const styleTop = Number(this.styleTop)

    // console.log('this.isInCircle', this.isInCircle)

    //  父元素拖拽
    if (this.isDrag) {

      // console.log('wrapperMousemove x', (x - this.x) / maxWidth)
      // console.log('wrapperMousemove y', (y - this.y) / maxHeight)

      let top = styleTop + (y - this.y) / maxHeight
      let left = styleLeft + (x - this.x) / maxWidth

      const res = this.isOut(width, height, top, left)
      top = res.top
      left = res.left
      this.setPos(top, left)
      this.config.onChange(true, width, height, left, top)
    }

    //  点位拖拽
    // if (this.isInCircle) {
    //   this.circleMousemove(x, y, width, height, maxWidth, maxHeight, styleLeft, styleTop)
    // }
  }

  wrapperMouseup() {
    //  console.log('wrapperMouseup')
    this.isDrag = false
    this.isInCircle = false
  }

  //  圆点拖拽函数
  circleMousemove(e) {
    //  点位拖拽
    if (!this.isInCircle) return

    const x = e.pageX
    const y = e.pageY
    const { maxWidth, maxHeight } = this.config
    const width = this.elWidth
    const height = this.elHeight
    const styleLeft = Number(this.styleLeft)
    const styleTop = Number(this.styleTop)
    const el = this.circleEl
    const type = el.dataset.func

    let h = (y - this.y) / maxHeight
    let w = (x - this.x) / maxWidth
    //  console.log('circleMousemove h', h)

    let curWidth = width
    let curHeight = height
    let top = styleTop
    let left = styleLeft

    switch(type) {
      case 'topLeft':
        curWidth = width + (-w)
        curHeight *= curWidth / width
        
        top = styleTop + (height - curHeight)
        left = styleLeft + (width - curWidth)
        
        break;
      
      case 'topCenter':
        curHeight = height + (-h)
        curWidth *= curHeight / height
        top = styleTop + (height - curHeight)
        left = styleLeft + (width - curWidth) / 2
        
        break;
      
      case 'topRight':
        curWidth = width + w
        curHeight *= curWidth / width
        top = styleTop + (height - curHeight)
        
        break;
      
      case 'centerRight':
        curWidth = width + w
        curHeight *= curWidth / width
        top = styleTop + (height - curHeight) / 2

        break;

      case 'bottomRight':
        curWidth = width + w
        curHeight *= curWidth / width
        
        break;
      
      case 'bottomCenter':
        curHeight = height + h
        curWidth *= curHeight / height
        left = styleLeft + (width - curWidth) / 2

        break;

      case 'bottomLeft':
        curWidth = width + (-w)
        curHeight *= curWidth / width
        left = styleLeft + (width - curWidth)

        break;
      
      case 'centerLeft':
        curWidth = width + (-w)
        curHeight *= curWidth / width
        top = styleTop + (height - curHeight) / 2
        left = styleLeft + (width - curWidth)

        break;

      default:
        break;
    }

    this.setSize(curWidth, curHeight)
    this.setPos(top, left)

    this.config.onChange(true, curWidth, curHeight, left, top)
  }
  
  //  边界判断
  isOut(w, h, top, left) {
    top = top <= 0 ? 0 : top
    left = left <= 0 ? 0 : left
    top = top + h > 1 ? (1 - h) : top
    left = left + w > 1 ? (1 - w) : left

    return {
      top,
      left
    }
  }

  dispose() {
    this.removeEvt()
    
    const viewBox = this.config.el.querySelector('.view-box-container')
    viewBox && viewBox.parentNode.removeChild(viewBox)
  }
}

export default ViewBox