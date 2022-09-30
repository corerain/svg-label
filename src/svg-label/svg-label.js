import { merge, createSvgEl, addHandle, removeHandle, deepClone } from './util'

class SvgLabel {
  constructor(opt) {
    this.config = {
      el: document.querySelector('.lbi-paint-container'), // 初始化dom元素
      shape: 'polygon', // 当前绘制的图形类型
      shapeIcon: {
        point: '',
        polyline: '',
        rect: '',
        polygon: ''
      },  // 绘制对应图形的鼠标悬浮icon
      showMask: false,  // 镂空蒙层是否开启
      maskInfo: {
        x: 0.25,
        y: 0.25,
        w: 0.25,
        h: 0.25,
        color: 'rgba(248, 47, 7, 0.3)'
      },  // 镂空蒙层配置坐标
      initData: [], // 绘制初始化数据
      drawConfig: {
        point: {
          color: '#FF1717',
          size: 4
        },
        polyline: {
          color: '#FF1717',
          size: 2
        },
        rect: {
          color: '#FF1717',
          size: 2,
          bgColor: 'none'
        },
        polygon: {
          color: '#FF1717',
          size: 2,
          bgColor: 'rgba(255, 23, 23, 0.3)'
        },
        text: {
          color: '#FFFFFF',
          size: 12,
          bgColor: '#FF1717',
          h: 20
        }
      },      // 绘制图形配置
      w: 880, // 容器图片显示宽度
      h: 550, // 容器图片显示高度
      type: 'draw',      //  类型  draw -- 绘制状态  drag底图拖拽状态
      isLock: false,     // 整个画布是否锁定状态
      isMouseWheel: true, // 是否开启鼠标滚轮缩放
      minScale: 0.5,  // 缩小最小倍数
      maxScale: 5,  // 放大最大倍数
      imgOnloadCb: () => {},  // 图片加载完成回调
      imgOnErr: () => {}, // 图片加载失败回调
      drawEnd: (type, points) => {
        console.log('drawEnd ' + type + '：', points, 'output data：', this.outputData)
      },
      handleResize: () => {}  // resize重置事件
    }

    this.config = merge(this.config, opt)

    this.x = 0
		this.y = 0
    this.imgNaturalWidth = 0
    this.imgNaturalHeight = 0
    this.styleTop = 0
    this.styleLeft = 0
    this.rectMinWidth = 4   //  绘制矩形最小宽度 小于这个值删除
    this.rectMinHeight = 4   //  绘制矩形最小高度 小于这个值删除
    this.curShape = {
      shape: '',
      els: [],
      points: []
    }    //  当前绘制元素相关信息
    this.isDrawEnd = true   //  是否正在绘制矩形
    this.scale = 1                    //  缩放比例
    this.isBindEvent = false          //  是否绑定事件
		this.imgWidth = 0                 //  图片当前宽度
		this.imgHeight = 0                //  图片当前高度
    this.viewWidth = 0                //  图片加载完成 画布宽度
    this.viewHeight = 0               //  图片加载完成 画布高度
    this.isLoaded = false             //  底图是否加载完成
    this.isDrag = false               //  当前是否可以拖拽底图
    this.outputData = [] // 绘制图形输出缓存数据

    this.init()
  }

  init() {
    let url = this.config.url

    if (!url) return

    this.loadStyle()
    this.renderUI()

    this.loadImg(this.config.url)
  }

  loadImg(url, drawData) {
    const { el, w, h, imgOnloadCb, imgModel, showMask, maskInfo } = this.config
    let img = el.querySelector('.lbi-img')
    let svg = el.querySelector('.svg-painter')
    this.isLoaded = false

    img.src = url + '?' + (+new Date())

    img.onload = () => {
      let imgWidth = img.naturalWidth
      let imgHeight = img.naturalHeight
      this.imgNaturalWidth = imgWidth
      this.imgNaturalHeight = imgHeight

      let { width, height } = this.getImgSize(w, h, imgWidth, imgHeight, imgModel)
      this.viewWidth = width
      this.viewHeight = height
      let left = (w - width) * 0.5
      let top = (h - height) * 0.5
      
      svg.setAttribute('viewBox', '0, 0, ' + width + ', ' + height)
      this.changeStyle(width, height, top, left)

      //  添加蒙层
      if (showMask) {
        this.deleteMask(svg)
        this.createSvgMask(svg, maskInfo.x, maskInfo.y, maskInfo.w, maskInfo.h, maskInfo.color)
      }

      // 图片加载完成
      imgOnloadCb && imgOnloadCb(width, height)
      this.isLoaded = true

      //  初始化图形
      drawData = drawData || this.config.initData
      this.initShape(svg, drawData, width, height)
      this.config.initData = []

      if (this.isBindEvent || this.config.isLock) return

      this.bindEvent()
    }

    img.onerror = () => {
      const { imgOnErr } = this.config
      imgOnErr && imgOnErr()
    }
  }

  //  window resize 暂未完成
  resize() {
    const { el, handleResize } = this.config
    this.scale = 1

    let w = el.offsetWidth
    let h = el.offsetHeight

    let imgWidth = this.imgNaturalWidth
    let imgHeight = this.imgNaturalHeight

    let { width, height } = this.getImgSize(w, h, imgWidth, imgHeight)
    this.viewWidth = width
    this.viewHeight = height
    let left = (w - width) / 2
    let top = (h - height) / 2
    
    this.changeStyle(width, height, top, left)
    handleResize && handleResize()
  }

  //  添加蒙层
  createSvgMask = (svg, x, y, w, h, color = 'rgba(248, 47, 7, 0.3)') => {
    const { el } =  this.config
    svg = svg || el.querySelector('.svg-painter')

    let rect = createSvgEl('rect', {
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      stroke: 'none',
      fill: color,
      mask: 'url(#svgMask)'
    })

    rect.id = 'rect-mask'
  
    let defsEl = createSvgEl('defs', {})
    defsEl.id = 'defs-mask'
    let maskEl = createSvgEl('mask', {
      id: 'svgMask'
    })
    let maskRect = createSvgEl('rect', {
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      stroke: 'none',
      fill: '#fff'
    })
    let rectHollowOut = createSvgEl('rect', {
      x: x * 100 + '%',
      y: y * 100 + '%',
      width: w * 100 + '%',
      height: h * 100 + '%',
      fill: 'red'
    })
  
    maskEl.appendChild(maskRect)
    maskEl.appendChild(rectHollowOut)
  
    svg.appendChild(rect)
    defsEl.appendChild(maskEl)
    svg.appendChild(defsEl)
  }

  //  删除蒙层
  deleteMask = (parent) => {
    const { el } =  this.config
    parent = parent || el.querySelector('.svg-painter')

    let rectEl = parent.querySelector('#rect-mask')
    let defsEl = parent.querySelector('#defs-mask')

    rectEl && parent.removeChild(rectEl)
    defsEl && parent.removeChild(defsEl)
  }

  getImgSize(maxWidth, maxHeight, imgWidth, imgHeight, type) {
    let scale = maxWidth / maxHeight
    let imgScale = imgWidth / imgHeight
    let width
    let height
    
    if (type !== 'cover') {
      if (imgScale >= scale) {
        width = maxWidth
        height = width * (imgHeight / imgWidth)
      }
      else {
        height = maxHeight
        width = height * imgScale
      }
    }
    else {
      if (imgScale >= scale) {
        height = maxHeight
        width = height * imgScale
      }
      else {
        width = maxWidth
        height = width * (imgHeight / imgWidth)
      }
    }

    return {
      width,
      height
    }
  }

  //  放大或缩小 计算样式
  setScale(scale, centralPoint) {
    if (this.config.isLock) return
    
    const { el } =  this.config
    let scaleNum = scale / this.scale
    let imgLastWidth = this.imgWidth
    let imgLastHeight = this.imgHeight
    let w = this.imgWidth * scaleNum
    let h = this.imgHeight * scaleNum
    
    let box = el.getBoundingClientRect()
    let boxLeft = box.left
    let boxTop = box.top

    centralPoint = centralPoint || {
      x: boxLeft + this.config.w / 2,
      y: boxTop + this.config.h / 2
    }
    

    let { top, left } = this.scaleCalculationImgPos(centralPoint, w, h, imgLastWidth, imgLastHeight)

    this.changeStyle(w, h, top, left)
    this.scale = scale
  }

  //  放大缩小设置图片坐标
  scaleCalculationImgPos(centralPoint, imgCurWidth, imgCurHeight, imgLastWidth, imgLastHeight) {
    const { el} = this.config
    const wrapper = el.querySelector('.svg-painter-box-wrapper')

    let { x, y } = centralPoint

    let left = 0
    let top = 0
    let box = el.getBoundingClientRect()
    let boxLeft = box.left
    let boxTop = box.top

    left = x - boxLeft
    top = y - boxTop
    let imgLeft = left - wrapper.offsetLeft
    let imgTop = top - wrapper.offsetTop

    left = left - imgCurWidth * (imgLeft / imgLastWidth)
    top = top - imgCurHeight * (imgTop / imgLastHeight)

    return {top , left}
  }

  //  设置底图 / svg样式
  changeStyle(w, h, top, left) {
    this.setStyleSize(w, h)
    this.setStylePos(top, left)
    this.imgWidth = w
    this.imgHeight = h
  }

  //  设置底图/svg画布宽高
  setStyleSize(w, h) {
    const { el } =  this.config
    const wrapper = el.querySelector('.svg-painter-box-wrapper')

    wrapper.style.width = w + 'px'
    wrapper.style.height = h + 'px'
  }

  //  设置底图/svg top left值
  setStylePos(top, left) {
    const { el } =  this.config
    const wrapper = el.querySelector('.svg-painter-box-wrapper')

    wrapper.style.top = top + 'px'
    wrapper.style.left = left + 'px'
  }

  renderUI() {
    let uiHtml = `
      <div class="lbi-paint-box">
        <div class="svg-painter-box">
          <div class="svg-painter-box-wrapper">
            <img src="" alt="" class="lbi-img" />
            <svg class="svg-painter"></svg>
          </div>
        </div>
      </div>
    `

    this.config.el.innerHTML = uiHtml
  }

  loadStyle() {
    let style = document.querySelector('.label-svg-style')

    if (!style) {
      style = document.createElement('style')
      style.className = 'label-svg-style'

      let styleStr = `
        .lbi-paint-box, .svg-painter-box {
          width: 100%;
          height: 100%;
          position: relative;
        }
        .svg-painter-box-wrapper {
          position: absolute;
        }
        .lbi-img {
          width: 100%;
          height: 100%;
        }
        .svg-painter {
          position: absolute;
          top: 0;
          left: 0;
        }
         .lbi-img {
           box-shadow: 2px 2px 5px 0 rgb(0 0 0 / 75%);
         }
        .svg-painter {
          z-index: 5;
        }
      `

      style.innerHTML = styleStr

      document.querySelector('head').appendChild(style)
    }
  }

  //  设置画布类型  draw--绘画状态 drag--底图拖拽状态
  setType(type) {
    this.config.type = type
  }

  //  设置画布绘画类型
  setDrawShape(shape) {
    this.config.shape = shape
  }

  //  事件绑定
  bindEvent() {
    let { el, isMouseWheel } = this.config
    const wrapper = el.querySelector('.svg-painter-box-wrapper')

    //  鼠标右键
    document.oncontextmenu = function() { return false }

    //  鼠标滚轮
    let agent = navigator.userAgent
    //  火狐浏览器 
    if (/.*Firefox.*/.test(agent)) { 
      isMouseWheel && addHandle(el, 'DOMMouseScroll', this.mouseScroll.bind(this))
    }
    //  非火狐浏览器
    else {
      isMouseWheel && addHandle(el, 'mousewheel', this.mouseScroll.bind(this))
    }
    
    addHandle(el, 'mouseover', this.wrapperMouseenter.bind(this))
    addHandle(el, 'mouseleave', this.wrapperMouseleave.bind(this))
    addHandle(el, 'mousemove', this.wrapperMousemove.bind(this))
    
    addHandle(wrapper, 'mousedown', this.handleMousedown.bind(this))
    addHandle(wrapper, 'mousemove', this.handleMousemove.bind(this))
    addHandle(wrapper, 'mouseup', this.handleMouseup.bind(this))

    this.isBindEvent = true
  }

  wrapperContextmenu() {
    return false
  }

  //  事件解绑
  removeEvent() {
    let { el } = this.config
    const wrapper = el.querySelector('.svg-painter-box-wrapper')
   
    //  鼠标右键
    document.oncontextmenu = null
    //  鼠标滚轮
    removeHandle(el, 'DOMMouseScroll', this.mouseScroll)
    removeHandle(el, 'mousewheel', this.mouseScroll)

    removeHandle(el, 'mouseover', this.wrapperMouseenter)
    removeHandle(el, 'mouseleave', this.wrapperMouseleave)
    removeHandle(el, 'mousemove', this.wrapperMousemove)

    removeHandle(wrapper, 'mousedown', this.handleMousedown)
    removeHandle(wrapper, 'mousemove', this.handleMousemove)
    removeHandle(wrapper, 'mouseup', this.handleMouseup)
  }

  wrapperMouseenter() {
    let { el, type, shapeIcon, shape } = this.config

    //  默认为绘画状态
    let mouseShape = 'crosshair'

    //  底图拖拽
    if (type === 'drag') {
      mouseShape = 'move'
    }
    else {
      let icon = shapeIcon[shape]
      mouseShape = `url(${icon || 'crosshair'}) 12 12, auto`
    }

    el.style.cursor = mouseShape
  }

  wrapperMouseleave() {
    let { el, shape } = this.config

    el.style.cursor = 'auto'
    this.isDrag = false

    switch(shape) {
      case 'point':
        break;
      case 'rect':
        //  鼠标没有松开离开
        this.drawRectEnd()
        
        break;

      case 'polyline':
      case 'polygon':
        break;

      default:
        break;
    }
  }

  mouseScroll(e) {
    e.preventDefault()

    const { minScale, maxScale, setScale } = this.config
    let scale = this.scale
    //  火狐 e.detail  非火狐 e.wheelDelta
    let delta = e.detail ? e.detail > 0 : e.wheelDelta < 0

    if (!delta) {
      scale += 0.1

      if (scale >= maxScale) {
        scale = maxScale
      }
    }
    else {
      scale -= 0.1

      if ( scale <= minScale) {
        scale = minScale
      }
    }

    let x = e.clientX
    let y = e.clientY
    
    setScale(scale)
    this.setScale(scale, {
      x,
      y
    })

    return false
  }

  wrapperMousemove() {
    if (this.config.type === 'drag') return
  }

  //  鼠标按下事件
  handleMousedown(e) {
    let type = this.config.type
    type = type.charAt(0).toUpperCase() + type.slice(1)
    
    this['handleMousedown' + type](e)
  }

  //  鼠标移动事件
  handleMousemove(e) {
    let type = this.config.type
    type = type.charAt(0).toUpperCase() + type.slice(1)

    this['handleMousemove' + type](e)
  }
  //  鼠标弹起事件
  handleMouseup(e) {
    let type = this.config.type
    type = type.charAt(0).toUpperCase() + type.slice(1)
    this['handleMouseup' + type](e)
  }

  //  鼠标按下--拖拽
  handleMousedownDrag(e) {
    let x = e.pageX
    let y = e.pageY

    this.x = x
    this.y = y
    this.isDrag = true

    const { styleTop, styleLeft } = this.getImgStyleTopLeft()

    this.styleTop = styleTop
    this.styleLeft = styleLeft
  }
  //  鼠标移动--拖拽
  handleMousemoveDrag(e) {
    if (!this.isDrag) return
    
    let x = e.pageX
    let y = e.pageY
    let top = this.styleTop + y - this.y
    let left = this.styleLeft + x - this.x

    //  边界判断  拖动到图片边缘不可以再拖动
    // const { w, h } = this.config
    // let imgWidth = this.imgWidth
    // let imgHeight = this.imgHeight
    // let maxLeft = w - imgWidth
    // let maxTop = h - imgHeight
    // left = left > 0 ? 0 : (left < maxLeft ? maxLeft : left)
    // top = top > 0 ? 0 : (top < maxTop ? maxTop : top)

    //  console.log('handleMousemoveDrag', top, left)
    this.setStylePos(top, left)
  }
  //  鼠标弹起--拖拽
  handleMouseupDrag() {
    this.isDrag = false
  }

  //  鼠标按下--绘画
  handleMousedownDraw(e) {
    let scale = 1 / this.scale
    
    this.x = e.offsetX * scale
    this.y = e.offsetY * scale

    this.mouseDownToDraw(e)
  }
  // 鼠标按下--绘画 回调
  mouseDownToDraw(e) {
    const { shape, el, drawEnd } = this.config
    let svg = el.querySelector('.svg-painter')
    let button = e.buttons
    let pointEl = null
    let points = [this.x, this.y]
    //  路径线条
    let polyline = el.querySelector('.cur-polyline-active');
    
    switch(shape) {
      case 'point':
        //  鼠标右键
        if (button === 2) return

        this.isDrawEnd = false

        pointEl = this.drawPoint(svg, points)
        var item = {
          els: [pointEl],
          shape: 'point',
          points: this.submitConvertData([points])
        }

        this.outputData.push(item)
        drawEnd && drawEnd('point', item)

        this.isDrawEnd = true
        this.cleanCurShapeData()
				break;

			case 'rect':
        //  鼠标右键
        if (button === 2) return

        this.isDrawEnd = false
				
        var rect = this.drawRect(svg, {
          x: this.x,
          y: this.y,
          width: 0,
          height: 0
        })

        this.curShape.els = [rect]
        this.curShape.shape = 'rect'
				break;

			case 'polygon':
        //  鼠标右键
        if (button === 2) {
          //  this.curPolygonRepeal()
          let els = this.curShape.els.filter(item => item.nodeName !== 'polyline')
          let points = this.curShape.points
          this.curShape = {
            ...this.curShape,
            ...this.curPolygonRepeal(els, points, polyline)
          }
        }

        //  鼠标左键
        if (button === 1) {
          this.isDrawEnd = false
          //  第一个点
          let polygonStartPoint = el.querySelector('.polygon-active-start-point')

          //  点击第一个点闭合  完成多边形绘制
          if (e.target === polygonStartPoint) {
            let curShape = this.curShape
            let points = curShape.points

            //  只有一个点 退出
            if (points.length < 3) {
              alert('多边形点不够，至少3个点')
            }
            //  绘画完成
            else {
              curShape.els.forEach(el => {
                if (el.nodeName === 'circle') {
                  el.style.display = 'none'
                }
              })
              curShape.els = curShape.els.filter(item => item.nodeName !== 'polyline')
              svg.removeChild(polyline)
              polygonStartPoint.classList.remove('polygon-active-start-point')
              
              //  绘制多边形
              let polygon = this.drawPolygon(svg, points)
              
              curShape.els.push(polygon)
              
              //  填充数据
              let dataPoints = this.submitConvertData(points)
              curShape = {
                ...curShape,
                points: dataPoints
              }
              this.outputData.push(curShape)
              drawEnd && drawEnd('polygon', curShape)

              this.isDrawEnd = true
              this.cleanCurShapeData()
            }
          }
          //  绘制多边形路径以及其他点
          else {
            //  创建第一个点
            if (!polygonStartPoint) {
              pointEl = this.drawPoint(svg, points, {
                class: ' polygon-active-start-point'
              })
            }
            //  绘制其他点
            else {
              pointEl = this.drawPoint(svg, points)
              let startClonePoint = polygonStartPoint

              //  将第一个点置于最上层
              svg.removeChild(polygonStartPoint)
              svg.appendChild(startClonePoint)
            }

            this.curShape.els.push(pointEl)
            this.curShape.shape = 'polygon'
            this.curShape.points.push(points)

            let linePoints = this.curShape.points
            
            // 路径线条不存在  创建
            if (!polyline) {
              polyline = this.drawPolyline(svg, linePoints, {
                class: 'cur-polyline-active'
              })
              this.curShape.els.push(polyline)
              return
            }
            
            polyline.setAttribute('points', linePoints.join(' '))
            polyline.setAttribute('data-position', JSON.stringify(linePoints))
          }
        }
        
				break;

			case 'polyline':
        //  鼠标左键
        if (button === 1) {
          this.isDrawEnd = false
          pointEl = this.drawPoint(svg, points)
          this.curShape.els.push(pointEl)
          this.curShape.shape = 'polyline'
          this.curShape.points.push(points)

          let linePoints = this.curShape.points
          
          if (!polyline) {
            polyline = this.drawPolyline(svg, linePoints, {
              class: 'cur-polyline-active'
            })
            this.curShape.els.push(polyline)

            return
          }

          polyline.setAttribute('points', linePoints.join(' '))
          polyline.setAttribute('data-position', JSON.stringify(linePoints))
        }

        //  鼠标右键
        if (button === 2) {
          let curShape = this.curShape
          let points = curShape.points

          //  只有一个点 删除退出
          if (points.length < 2) {
            this.removeCurShapeEls()
          }
          else {
            curShape.els.forEach(el => {
              if (el.nodeName === 'circle') {
                el.style.display = 'none'
              }
            })
            polyline.setAttribute('points', points.join(' '))
            polyline.classList.remove('cur-polyline-active')
            
            let dataPoints = this.submitConvertData(points)
            curShape = {
              ...curShape,
              points: dataPoints
            }
            this.outputData.push(curShape)
            drawEnd && drawEnd('polyline', curShape)
          }

          this.isDrawEnd = true
          this.cleanCurShapeData()
        }
				break;
			default:
				break;
    }
  }
  //  鼠标移动--绘画
  handleMousemoveDraw(e) {
    if (this.isDrawEnd) return

    const { shape, el } = this.config
    let scale = 1 / this.scale
    let offsetX = e.offsetX * scale
    let offsetY = e.offsetY * scale
    let x = 0
    let y = 0
    let curShapePoints = this.curShape.points
    let movePoints = curShapePoints.concat([offsetX, offsetY])
    let polyline = el.querySelector('.cur-polyline-active')

    switch(shape) {
      case 'point':
				break;

			case 'rect':
        offsetX > this.x ? x = this.x : x = offsetX
        offsetY > this.y ? y = this.y : y = offsetY
        // eslint-disable-next-line no-case-declarations
        let width = Math.abs(offsetX - this.x)
        // eslint-disable-next-line no-case-declarations
        let height = Math.abs(offsetY - this.y)
        // eslint-disable-next-line no-case-declarations
        let curShapeEl = this.curShape.els[0]
        curShapeEl.setAttribute('x', x)
        curShapeEl.setAttribute('y', y)
        curShapeEl.setAttribute('width', width)
        curShapeEl.setAttribute('height', height)
        this.curShape.points = [
          [x, y],
          [x + width, y],
          [x, y + height],
          [x + width, y + height]
        ]
				
				break;

			case 'polygon':
      case 'polyline':
        polyline && polyline.setAttribute('points', movePoints.join(' '))
				break;
        
			default:
				break;
    }
    
  } 
  //  鼠标弹起--绘画
  handleMouseupDraw(e) {
    const { shape } = this.config
    let button = e.buttons

    switch(shape) {
      case 'point':
				break;

			case 'rect':
        this.drawRectEnd()
				
				break;

			case 'polygon':
				break;

			case 'polyline':
        //  鼠标右键
        if (button === 2) {
          this.isDrawEnd = true
        }
				break;
			default:
        this.cleanCurShapeData()
				break;
    }
  }
  //  清空当前绘画
  cleanCurShapeData() {
    this.curShape = {
      els: [],
      shape: '',
      points: []
    }
  }
  //  删除当前SVG元素
  removeCurShapeEls() {
    let curShape = this.curShape
    let els = curShape.els

    els.forEach(el => {
      el.parentNode.removeChild(el)
    })

    this.isDrawEnd = true
    this.cleanCurShapeData()
  }
   
  drawPoint(parent, points, attrs = {}) {
    const { drawConfig, el } = this.config
    const { size, color } = drawConfig.point
    const cx = points[0]
    const cy = points[1]
    
    let config = {
      class: ``,
      cx,
      cy,
      r: size,
      stroke: color,
      fill: color,
      'data-position': JSON.stringify(points)
    }
    config = {
      ...config,
      ...attrs
    }

    let point = createSvgEl('circle', config)
    parent.appendChild(point)

    point.addEventListener('mouseover', function (e) {
      let target = e.target
      
      if (target === el.querySelector('.polygon-active-start-point')) {
        //  target.style.borderColor = 'black'
        target.setAttribute('stroke', 'yellow')
        target.style.strokeWidth = 20
      }
      target.style.strokeWidth = 10
		})
		point.addEventListener('mouseout', function (e) {
      let target = e.target
			target.style.strokeWidth = 1
      target.setAttribute('fill', color)
		})

    return point
  }

  drawRect(parent, attrs = {}) {
    const { drawConfig } = this.config
    const { size, color, bgColor } = drawConfig.rect

    let config = {
      'class': '',
    }
    config = {
      ...config,
      'stroke-width': size,
      stroke: color,
      fill: bgColor,
      ...attrs
    }
    let rect = createSvgEl('rect', config)
    parent.appendChild(rect)

    return rect
  }

  //  绘制矩形完成回调
  drawRectEnd() {
    if (!this.isDrawEnd) {
      let curShape = this.curShape
      let rect = curShape.els[0]
      let w = rect.getAttribute('width')
      let h = rect.getAttribute('height')

      if (w < this.rectMinWidth || h < this.rectMinHeight) {
        rect.parentNode.removeChild(rect)
      }
      else {
        curShape = {
          ...curShape,
          points: this.submitConvertData(curShape.points)
        }
        this.outputData.push(curShape)
        let drawEnd = this.config.drawEnd
        drawEnd && drawEnd('rect', curShape)
      }

      this.isDrawEnd = true
      this.cleanCurShapeData()
    }
  }
  
  drawPolygon(parent, points, attrs = {}) {
    const { drawConfig } = this.config
    const { size, color, bgColor } = drawConfig.polygon

    let config = {
      class: '',
      points: points.join(' '),
      stroke: color,
      'stroke-width': size,
      fill: bgColor,
      'data-position': JSON.stringify(points)
    }

    config = {
      ...config,
      ...attrs
    }
    let polygon = createSvgEl('polygon', config)
    parent.appendChild(polygon)

    return polygon
  }
  drawPolyline(parent, points, attrs = {}) {
    const { drawConfig } = this.config
    const { size, color } = drawConfig.polyline

    let config = {
      points: points.join(' '),
      fill: 'none',
      stroke: color,
      'stroke-width': size,
      'data-position': JSON.stringify(points)
    }
    config = {
      ...config,
      ...attrs
    }
    let polyline = createSvgEl('polyline', config)
    parent.appendChild(polyline)

    return polyline
  }
  // 绘制文本
  drawText(parent, text, point, maxWidth, maxHeight, attrs = {}) {
    const { drawConfig } = this.config
    const { size, color } = drawConfig.text
    let fontSize = size
    const textLen = text.length
    const curWidth = size * textLen

    if (curWidth > maxWidth) {
      fontSize = Math.floor(maxWidth / textLen)
    }

    let config = {
      x: point.x + maxWidth * 0.5,
      y: point.y + maxHeight * 0.5,
      fill: color,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      style: {
        'font-size': `${fontSize}px`
      }
    }

    config = {
      ...config,
      ...attrs
    }

    let el = createSvgEl('text', config)
    parent.appendChild(el)
    el.innerHTML = text

    return el
  }
  //  获取元素style top left
  getImgStyleTopLeft() {
    const { el } =  this.config
    const wrapper = el.querySelector('.svg-painter-box-wrapper')
    let styleTop = parseFloat(wrapper.style.top)
    let styleLeft = parseFloat(wrapper.style.left)

    return {
      styleTop,
      styleLeft
    }
  }

  clean() {
    const { el, showMask, maskInfo } =  this.config
    let svg = el.querySelector('.svg-painter')
    this.isDrawEnd = true
    this.outputData = []
    this.curShape = {
      els: [],
      shape: '',
      points: []
    }
    svg.innerHTML = ''
    showMask && this.createSvgMask(svg, maskInfo.x, maskInfo.y, maskInfo.w, maskInfo.h, maskInfo.color)
  }
  //  上一步  撤销
  repeal() {
    if (this.config.isLock) return

    let last = this.outputData.pop()
    
    if (!last) {

      return
    }

    let els = last.els
    els.forEach(el => {
      let parent = el.parentNode
      parent.removeChild(el)
    })
  }
  //  获取数据
  getData() {
    return this.outputData
  }
  //  当前绘制多边形撤销到上一步
  curPolygonRepeal(els, points, polyline) {
    let popEl = els.pop()

    if (!popEl) {
      return {
        els: [],
        points: []
      }
    }

    popEl.parentNode.removeChild(popEl)
    points.pop()

    polyline.setAttribute('points', points.join(' '))

    //  最后一个圆点
    if (els.length === 0) {
      polyline.parentNode.removeChild(polyline)
      this.isDrawEnd = true
      this.cleanCurShapeData()
    }

    return {
      els,
      points
    }
  }
  //  转换数据格式  提交
  submitConvertData(data) {
    let w = this.viewWidth
    let h = this.viewHeight
    let arr = []

    data.forEach(item => {
      let x = item[0] / w
      let y = item[1] / h
      let obj = {
        x,
        y
      }

      arr.push(obj)
    })

    return arr
  }
  //  初始化绘制图形
  initShape(parent, data, w, h) {
    data.forEach(item => {
      let { shape, points, className = '', attrs = {} } = item
      let curShape = {
        shape,
        points
      }

      let drawPoints = deepClone(points).map(point => {
        point.x *= w
        point.y *= h

        return point
      })

      let svgEl = null

      switch(shape) {
        case 'point':
          svgEl = this.drawPoint(parent, [drawPoints[0].x, drawPoints[0].y], attrs)
          break;

        case 'rect':
          // eslint-disable-next-line no-case-declarations
          const point1 = drawPoints[0]
          // eslint-disable-next-line no-case-declarations
          const point4 = drawPoints[3]
          svgEl = this.drawRect(parent, {
            x: point1.x,
            y: point1.y,
            width: point4.x - point1.x,
            height: point4.y - point1.y,
            ...attrs
          })
          break;

        case 'polyline':
          drawPoints = drawPoints.map(item => {
            let arr = [item.x, item.y]

            return arr
          })
          svgEl = this.drawPolyline(parent, drawPoints, attrs)
          break;

        case 'polygon':
          drawPoints = drawPoints.map(item => {
            let arr = [item.x, item.y]

            return arr
          })
          svgEl = this.drawPolygon(parent, drawPoints, attrs)
          break;

        case 'text':
          svgEl = this.drawRectText(parent, item.text, drawPoints, attrs)
          break;

        default:
          break;
      }

      if (svgEl instanceof Array && svgEl.length) {
        svgEl.forEach(el => {
          el.setAttribute('class', className)
          
        })

        curShape.els = [...svgEl]
      }
      else {
        svgEl.setAttribute('class', className)
        curShape.els = [svgEl]
      }
      
      this.outputData.push(curShape)
    })
  }

  // 绘制矩形文本
  drawRectText(parent, text, drawPoints, attrs) {
    const startPoint = drawPoints[0]
    const endPoint = drawPoints[1]
    const height = this.config.drawConfig.text.h
    const { bgColor, fill } = attrs
    const width = endPoint.x - startPoint.x

    const rectShape = this.drawRect(parent, {
      x: startPoint.x,
      y: startPoint.y,
      width,
      height,
      fill: bgColor,
      stroke: bgColor
    })

    const textShape = this.drawText(parent, text, startPoint, width, height, {
      fill
    })

    return [rectShape, textShape]
  }

  //  销毁事件
  dispose() {
    this.clean()
    this.removeEvent()
  }
}

export default SvgLabel