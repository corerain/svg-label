<template>
  <div class="roi-container bsizing" v-loading="isLoading">
    <div class="has-img" v-if="img && !imgIsLoadErr">
      <header
        v-if="tools.length && drawTools.length"
        class="header flex-v-c bsizing">
        <!-- 绘制工具渲染 -->
        <div
          v-for="(item, index) in drawTools"
          :key="item.type"
          :class="[
            'draw-shape tool-item bsizing',
            'draw-shape-' + item.type,
            index === drawTools.length - 1 ? 'draw-shape-last' : '',
            isLock ? 'disabled' : ''
          ]"
          @click="handleDraw(item.type)"
        >
          <el-tooltip effect="dark" :content="item.text" placement="top">
            <div
              :class="[
                'tool-item-wrapper flex-v-c bsizing',
                item.type === shape ? 'active' : ''
              ]"
            >
              <div
                :class="[
                  'tool-icon',
                  'tool-item-' + item.type + '-icon'
                ]"
              ></div>
            </div>
          </el-tooltip>
        </div>

        <!-- 操作工具栏 -->
        <div
          v-for="item in tools"
          :key="item.type"
          :class="[
            'operate-tool-item tool-item bsizing',
            'tool-item-' + item.type,
          ]"
          @click="handleSelectTool(item.type)"
        >
          <!-- 放大缩小滑块 -->
          <el-slider
            v-model="scale"
            v-if="item.type === 'progressBar'"
            :min="minScale"
            :max="maxScale"
            :step="step"
            :format-tooltip="formatTooltip"
            @change="setScale"
          ></el-slider>

          <!-- 背景选择 -->
          <div class="flex-v-c" v-else-if="item.type === 'changeBg'">
            <el-dropdown placement="bottom" @command="handleChangeBg">
              <div class="tool-item-bg tool-item-wrapper">
                <div :class="['tool-icon', 'tool-item-' + item.type + '-icon']"></div>
              </div>
              <el-dropdown-menu class="cus-dropdown-menu-drop" slot="dropdown">
                <el-dropdown-item
                  v-for="bg in bgList"
                  :key="bg.type"
                  :command="bg.type"
                  :class="[curBg === bg.type ? 'active' : '']"
                >
                  <div class="bg-text">{{ bg.name }}</div>
                  <div :class="['bg-icon', `bg-icon-${bg.type}`]"></div>
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>

          <!-- 点位安全区 -->
          <div class="safe flex-v-c" v-else-if="item.type === 'safe'">
            {{ item.text }}
            <el-switch
              size="small"
              :width="30"
              v-model="isShowSafe"
              active-color="#1872f0"
              inactive-color="rgba(27, 53, 89, 0.25)"
              @change="handleSwitchSafe"
            ></el-switch>
          </div>

          <!-- 默认区域 -->
          <el-tooltip
            v-else-if="item.type === 'area'"
            effect="dark"
            :content="item.text"
            placement="top"
          >
            <div class="tool-item-area tool-item-wrapper">
              <div :class="['tool-icon', 'tool-item-' + item.type + '-icon']"></div>
            </div>
          </el-tooltip>

          <el-tooltip v-else effect="dark" :content="item.text" placement="top">
            <div
              :class="['tool-item-wrapper flex-v-c bsizing', item.type === mode ? 'active' : '']"
            >
              <div :class="['tool-icon', 'tool-item-' + item.type + '-icon']"></div>
            </div>
          </el-tooltip>
        </div>
      </header>
      <div class="roi-img bsizing"></div>
    </div>

    <div v-if="imgIsLoadErr" class="img-load-err">
      <img :src="require(`./img/roi-404.png`)" />
    </div>

    <input type="file" accept="image/*" class="none upload-input" @change="uploadInputChange" />
  </div>
</template>

<script>
import SvgLabel from './svg-label'
import { deepClone } from './util'
import mousePoint from './img/mouse-point.png'
import mousePolyline from './img/mouse-polyline.png'
import mouseRect from './img/mouse-rect.png'
import mousePolygon from './img/mouse-polygon.png'
import ViewBox from './viewBox'

export default {
  props: {
    // 绘制底图
    img: {
      type: String,
      default: ''
    },
    // 上传图片回调
    upload: {
      type: Function,
      default: async () => {}
    },
    // 初始化绘制数据
    initData: {
      type: Array,
      default: () => [
        {
          shape: 'point',
          points: [
            {
              x: 0.5181818181818182,
              y: 0.1840909090909091
            }
          ]
        },
        {
          shape: 'rect',
          points: [
            { x: 0.33636363636363636, y: 0.4670454545454546 },
            { x: 0.7579545454545454, y: 0.4670454545454546 },
            { x: 0.33636363636363636, y: 0.697159090909091 },
            { x: 0.7579545454545454, y: 0.697159090909091 }
          ]
        },
        {
          shape: 'polyline',
          points: [
            { x: 0.12386363636363637, y: 0.15000000000000002 },
            { x: 0.38977272727272727, y: 0.35625 },
            { x: 0.47613636363636364, y: 0.2028409090909091 }
          ]
        },
        {
          shape: 'polygon',
          points: [
            { x: 0.5965909090909091, y: 0.13977272727272727 },
            { x: 0.5511363636363636, y: 0.34090909090909094 },
            { x: 0.8022727272727272, y: 0.3698863636363637 },
            { x: 0.7954545454545454, y: 0.6937500000000001 },
            { x: 0.4738636363636364, y: 0.5607954545454545 },
            { x: 0.7556818181818182, y: 0.1653409090909091 }
          ]
        }
      ]
    },
    // 操作工具
    tools: {
      type: Array,
      default: () => [
        { type: 'drag', name: '平移', text: '平移' },
        { type: 'repeal', name: '撤销', text: '撤销' },
        { type: 'clean', name: '清空', text: '清空' },
        { type: 'changeBg', name: '背景', text: '背景' },
        { type: 'shrink', name: '缩小', text: '缩小' },
        { type: 'progressBar', name: '进度条', text: '' },
        { type: 'magnify', name: '放大', text: '放大' },
        // { type: 'safe', name: '点位安全区', text: '显示点位安全区' },
        // { type: 'area', name: '默认区域', text: '默认区域' },
        { type: 'upload', name: '上传图片', text: '上传图片' }
      ]
    },
    //  绘制工具
    drawTools: {
      type: Array,
      default: () => [
        { type: 'point', name: '点', text: '点'},
        { type: 'polyline', name: '线', text: '线' },
        { type: 'rect', name: '矩形', text: '矩形' },
        { type: 'polygon', name: '多边形', text: '多边形' },
      ]
    },
    // 每个图形绘制完成回调
    drawEnd: {
      type: Function,
      default: (shapeInfo) => {
        console.log(`drawEnd:`, shapeInfo)
      }
    },
    // 清空回调
    clean: {
      type: Function,
      default: () => { }
    },
    // 初始化绘制形状
    initShape: {
      type: String,
      default: ''
    },
    // 画布是否锁定
    isLock: {
      type: Boolean,
      default: false
    },
    // 默认区域配置参数
    defAreaConfig: {
      type: Object,
      default: () => ({})
    },
    // 默认区域移动回调
    areaChange: {
      type: Function,
      default: () => {}
    },
    // 缩小最小倍数
    minScale: {
      type: Number,
      default: 0.5
    },
    // 放大最大倍数
    maxScale: {
      type: Number,
      default: 5
    }
  },
  data () {
    return {
      scale: 1,
      step: 0.1,
      mode: 'draw',    //  模式 draw--绘制 drag--拖拽
      shape: '',        //  绘制形状
      roiInstance: null,
      isLoading: false,
      points: [],
      shapeIcon: {
        point: mousePoint,
        polyline: mousePolyline,
        rect: mouseRect,
        polygon: mousePolygon
      },
      isShowSafe: false,
      safeMaskInfo: {
        x: 0.178,
        y: 0.17,
        w: 0.546,
        h: 0.44,
        color: 'rgba(248, 47, 7, 0.3)'
      },
      isShowViewArea: false,
      viewBox: null,
      imgWidth: 0,
      imgHeight: 0,
      isFirstLoadImg: true,
      imgIsLoadErr: false,
      bgList: [
        { name: '透明背景', type: 'opacity' },
        { name: '黑色背景', type: 'black' },
        { name: '白色背景', type: 'white' },
      ],
      curBg: 'opacity'
    }
  },
  mounted() {
    if (!this.img) {
      return
    }

    this.points = deepClone(this.initData)
    this.initRoi(this.img, this.initData)

    this.isShowViewArea = Object.keys(this.defAreaConfig).length ? true : false
  },
  methods: {
    // 初始化
    initRoi(img, initData) {
      this.isLoading = true
      let shapeIcon = this.shapeIcon
      let el = this.$el.querySelector('.roi-img')
      let w = el.offsetWidth
      let h = el.offsetHeight
      const isLock = this.isLock
      const minScale = this.minScale
      const maxScale = this.maxScale
      let shape = isLock ? '' : this.initShape

      this.roiInstance = new SvgLabel({
        el,
        w,
        h,
        shape,
        shapeIcon,
        minScale,
        maxScale,
        imgOnloadCb: this.imgOnloadCb,
        imgOnErr: this.imgOnErr,
        url: img,
        isLock,
        initData,
        isMouseWheel: true,
        drawEnd: this.handleDrawEnd,
        showMask: this.isShowSafe,
        maskInfo: this.safeMaskInfo,
        handleResize: this.handleResize,
        imgWidth: 0,
        imgHeight: 0,
        setScale: (scale) => {
          this.scale = scale
        }
      })
    },
    // 暂未实现
    handleResize() {
      this.scale = 1
    },
    // 修改背景
    handleChangeBg(command) {
      const roiImg = this.$el.querySelector('.roi-img')
      const bgColor = {
        white: 'bg-white',
        black: 'bg-black'
      }

      roiImg.className = 'roi-img bsizing'
      if (command === 'opacity') {
        return
      }

      roiImg.classList.add(bgColor[command])
    },
    //  背景图加载完成
    imgOnloadCb(imgWidth, imgHeight) {
      this.isLoading = false
      this.imgIsLoadErr = false
      this.imgWidth = imgWidth
      this.imgHeight = imgHeight

      if (this.isFirstLoadImg && this.isShowViewArea) {
        this.initAreaViewBox(imgWidth, imgHeight)
        this.isFirstLoadImg = false
      }
      else {
        this.isShowViewArea = false
        this.viewAreaBoxDispose()
        this.areaChange(this.isFirstLoadImg ? false : true, {})
      }
    },
    //  背景图加载失败
    imgOnErr() {
      this.isLoading = false
      this.imgIsLoadErr = true

      const roiInstance = this.roiInstance
      roiInstance && roiInstance.dispose()

      this.roiInstance = null
    },
    //  工具选择
    handleSelectTool(type) {
      let eventType = 'handle' + type.replace(type[0], type[0].toUpperCase())

      if (type === 'progressBar' || type === 'safe') {
        //  console.log('缩放条点击')
        return
      }

      this[eventType]()
    },
    //  绘画
    handleDraw(shape) {
      this.mode = 'draw'

      if (this.shape === shape) {
        return
      }

      this.shape = shape
      let instance = this.roiInstance

      if (!instance) {
        return
      }

      //  画布锁定
      if (this.isLock) {
        // console.log('roi lock')
        this.shape = ''
        instance.setType('draw')
        return
      }

      instance.setType('draw')
      instance.setDrawShape(shape)
      // instance.setAxisIsShow(true)
      instance.removeCurShapeEls()
    },
    //  绘制完成
    handleDrawEnd(shape, shapeInfo) {
      //  console.log('handleDrawEnd', shape, shapeInfo)
      let instance = this.roiInstance
      this.shape = ''
      instance.setType('draw')
      instance.setDrawShape('')

      let drawEnd = this.drawEnd
      drawEnd && drawEnd(shapeInfo)

      this.points.push(shapeInfo)
    },
    //  拖拽
    handleDrag() {
      this.mode = 'drag'
      let instance = this.roiInstance

      if (!instance) {
        return
      }

      this.shape = ''
      instance.removeCurShapeEls()
      instance.setType('drag')
    },
    //  缩小
    handleShrink() {
      this.scale--

      if (this.scale <= this.minScale) {
        this.scale = this.minScale
      }

      this.setScale(this.scale)
    },
    //  放大
    handleMagnify() {
      this.scale++

      if (this.scale >= this.maxScale) {
        this.scale = this.maxScale
      }

      this.setScale(this.scale)
    },
    //  设置图片尺寸
    setImgSize(scale) {
      this.imgWidth *= scale
      this.imgHeight *= scale

      // if (this.viewBox) {
      //   this.viewBox.setMaxValue(this.imgWidth, this.imgHeight)
      // }
    },
    //  放大缩小函数
    setScale(scale) {
      let instance = this.roiInstance

      if (!instance) return

      instance.setScale(scale)
      //  this.setImgSize(this.scale)
    },
    //  上传按钮
    handleUpload() {
      let uploadInput = this.$el.querySelector('.upload-input')
      uploadInput.click()
    },
    // 上传图片回调
    async uploadInputChange(e) {
      let file = e.target.files[0]
      //  console.log('uploadInputChange file', file)
      e.target.value = ''

      this.isLoading = true
      let url = await this.upload(file)
      this.isLoading = false

      if (!url) {
        return
      }

      if (!this.roiInstance) {
        this.$nextTick(() => {
          this.points = deepClone(this.initData)
          this.initRoi(url, this.initData)
        })
        return
      }

      this.handleSwitchImg(url)
    },
    //  切换背景图
    switchBgImg(url) {
      if (!url) {
        return
      }

      this.imgIsLoadErr = false

      if (!this.roiInstance) {
        this.$nextTick(() => {
          this.points = deepClone(this.initData)
          this.initRoi(url, this.initData)
        })
        return
      }

      this.handleSwitchImg(url)
    },
    //  切换底图
    handleSwitchImg(url) {
      let instance = this.roiInstance

      this.scale = 1
      instance.setScale(1)
      this.handleClean()

      instance.loadImg(url)
      // console.log('清空并重新替换底图')
    },
    //  撤销
    handleRepeal() {
      let instance = this.roiInstance

      if (!instance) {
        return
      }

      instance.repeal()
      this.points.pop()

      // console.log('撤销', this.points)
    },
    //  清空
    handleClean() {
      //  console.log('handleClean')
      let instance = this.roiInstance
      instance && instance.clean()
      this.points = []

      let clean = this.clean
      clean && clean()
    },
    //  格式化显示
    formatTooltip(val) {
      return Math.floor(val * 100) + '%'
    },
    //  是否显示安全区
    handleSwitchSafe(isSafe) {
      let instance = this.roiInstance

      if (!instance) {
        return
      }

      if (isSafe) {
        const { x, y, w, h, color } = this.safeMaskInfo
        instance.createSvgMask('', x, y, w, h, color)
      }
      else {
        instance.deleteMask()
      }
    },
    // 获取数据回调
    getData() {
      return this.points
    },
    // 销毁函数
    dispose() {
      let instance = this.roiInstance
      instance && instance.dispose()
      this.roiInstance = null
    },
    //  安全区域
    handleArea() {
      this.isShowViewArea = !this.isShowViewArea

      if (!this.viewBox) {
        this.initAreaViewBox(this.imgWidth, this.imgHeight)
      }
      else {
        this.viewAreaBoxDispose()
      }
      const defAreaConfig = this.getViewAreaInfo()
      this.areaChange(true, defAreaConfig)
    },
    // 初始化默认区域
    initAreaViewBox(imgWidth, imgHeight) {
      this.viewAreaBoxDispose()
      const el = this.$el.querySelector('.lbi-svg-box-wrapper')

      this.viewBox = new ViewBox({
        el,
        maxWidth: imgWidth,
        maxHeight: imgHeight,
        config: this.defAreaConfig,
        onChange: (isEdit, w, h, x, y) => {
          this.areaViewBoxChange(isEdit, w, h, x, y)
        }
      })
    },
    //  默认区域移动 大小改变
    areaViewBoxChange(isEdit, w, h, x, y) {
      this.areaChange(isEdit, { w, h, x, y })
    },
    //  销毁默认区域
    viewAreaBoxDispose() {
      this.viewBox && this.viewBox.dispose()
      this.viewBox = null
    },
    //  获取默认安全区域坐标信息
    getViewAreaInfo() {
      let info = {}
      if (!this.viewBox) {
        info = {}
      }
      else {
        info = this.viewBox.getElPos()
      }

      return info
    }
  },
  beforeDestroy() {
    this.dispose()
    this.viewAreaBoxDispose()
  },
  watch: {
    // 监听画布是否锁定
    isLock: {
      handler(val) {
        this.$nextTick(() => {
          if (!val) {
            this.handleDraw(this.initShape)
          }
        })
      },
      immediate: true
    }
  }
}
</script>

<style lang="scss">
.roi-container {
  padding: 0 16px;
  height: 100%;
  position: relative;

  .has-img {
    display: flex;
    flex-direction: column;
    height: 100%;

    .header {
      height: 48px;
      background: #f5f7fa;
      border-radius: 4px;
      width: 100%;
      white-space: nowrap;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 4px 6px;
      position: relative;

      .el-switch__core {
        height: 16px;

        &:after {
          width: 12px;
          height: 12px;
        }
      }

      .el-switch.is-checked .el-switch__core::after {
        margin-left: -12px;
      }

      .tool-item {
        display: inline-block;
        margin-right: 8px;
        color: rgba(14, 27, 46, 1);
        font-size: 12px;
      }

      .tool-item-wrapper {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 4px;

        .tool-icon {
          width: 20px;
          height: 20px;
        }

        .tool-text {
          margin-top: 4px;
          line-height: 1;
        }

        &:hover {
          background: rgba(14, 27, 46, 0.05);
        }
        .tool-item-point-icon {
          background: url("./img/point.png") no-repeat center center;
          background-size: contain;
        }
        .tool-item-polyline-icon {
          background: url("./img/polyline.png") no-repeat center
            center;
          background-size: contain;
        }
        .tool-item-area-icon {
          background: url("./img/area.png") no-repeat center center;
          background-size: contain;
        }
        .tool-item-rect-icon {
          background: url("./img/rect.png") no-repeat center center;
          background-size: contain;
        }
        .tool-item-changeBg-icon {
          background: url("./img/change-bg.png") no-repeat center
            center;
          background-size: contain;
          filter: drop-shadow(32px 0 #252526);
          position: relative;
          left: -32px;
        }
        .tool-item-polygon-icon {
          background: url("./img/polygon.png") no-repeat center
            center;
          background-size: contain;
        }
        .tool-item-drag-icon {
          background: url("./img/drag.png") no-repeat center center;
          background-size: contain;
        }
        .tool-item-shrink-icon {
          background: url("./img/shrink.png") no-repeat center center;
          background-size: contain;
        }
        .tool-item-magnify-icon {
          background: url("./img/magnify.png") no-repeat center
            center;
          background-size: contain;
        }
        .tool-item-repeal-icon {
          background: url("./img/repeal.png") no-repeat center center;
          background-size: contain;
        }
        .tool-item-clean-icon {
          background: url("./img/clean.png") no-repeat center center;
          background-size: contain;
        }
        .tool-item-upload-icon {
          background: url("./img/upload.png") no-repeat center center;
          background-size: contain;
        }

        &:active {
          color: rgba(24, 114, 240, 1);

          .tool-item-shrink-icon {
            background: url("./img/shrink-active.png") no-repeat
              center center;
            background-size: contain;
          }
          .tool-item-magnify-icon {
            background: url("./img/magnify-active.png") no-repeat
              center center;
            background-size: contain;
          }
          .tool-item-repeal-icon {
            background: url("./img/repeal-active.png") no-repeat
              center center;
            background-size: contain;
          }
          .tool-item-clean-icon {
            background: url("./img/clean-active.png") no-repeat
              center center;
            background-size: contain;
          }
          .tool-item-upload-icon {
            background: url("./img/upload-active.png") no-repeat
              center center;
            background-size: contain;
          }
        }
        &.active {
          .tool-item-point-icon {
            background: url("./img/point-active.png") no-repeat
              center center;
            background-size: contain;
          }
          .tool-item-polyline-icon {
            background: url("./img/polyline-active.png") no-repeat
              center center;
            background-size: contain;
          }
          .tool-item-area-icon,
          .tool-item-rect-icon {
            background: url("./img/rect-active.png") no-repeat center
              center;
            background-size: contain;
          }
          .tool-item-polygon-icon {
            background: url("./img/polygon-active.png") no-repeat
              center center;
            background-size: contain;
          }
          .tool-item-drag-icon {
            background: url("./img/drag-active.png") no-repeat center
              center;
            background-size: contain;
          }
        }
      }
      .draw-shape .tool-item-wrapper.active,
      .tool-item-drag .tool-item-wrapper.active {
        .tool-text {
          color: rgba(24, 114, 240, 1);
        }
      }

      .tool-item-shrink {
        margin-left: 17px;
        position: relative;

        &:before {
          display: block;
          content: "";
          width: 1px;
          height: 28px;
          background: rgba(14, 27, 46, 0.1);
          position: absolute;
          top: 50%;
          left: -12px;
          transform: translateY(-50%);
        }
      }

      .tool-item-magnify,
      .tool-item-shrink {
        .tool-item-wrapper {
          width: 32px;
          height: 32px;
          padding: 0;
          justify-content: center;
        }
      }
      .tool-item-progressBar,
      .tool-item-shrink {
        margin-right: 4px;
      }
      .tool-item-upload {
        //  margin-right: 13px;
        .tool-item-wrapper {
          width: 60px;
        }
      }

      .el-slider {
        width: 100px;

        .el-slider__button {
          width: 12px;
          height: 12px;
          background: #f5f7fa;
          border: 2px solid #3d3e40;
          border-radius: 100%;
          box-sizing: border-box;
        }

        .el-slider__runway {
          background: rgba(0, 0, 0, 0.15);
          height: 2px;
        }

        .el-slider__runway,
        .el-slider__bar {
          height: 2px;
        }
        .el-slider__button-wrapper {
          top: -17px;
        }
        .el-slider__bar {
          background: #3d3e40;
        }
      }

      .tool-item-upload {
        position: absolute;
        top: 50%;
        right: 6px;
        transform: translateY(-50%);
        margin-right: 0;
      }

      .tool-item-safe {
        position: absolute;
        top: 50%;
        right: 68px;
        transform: translateY(-50%);

        .el-switch {
          margin-left: 8px;
        }
      }

      .tool-item-area {
        width: 32px;
        height: 32px;
        // position: absolute;
        // top: 50%;
        // right: 6px;
        // transform: translateY(-50%);
        // margin-right: 0;
        // text-align: center;

        .tool-item-area-icon {
          margin: 0 auto;
        }
      }
    }

    .roi-img {
      width: 100%;
      flex: 1;
      margin-top: 16px;
      overflow: hidden;
      background: linear-gradient(
          to right,
          rgba(14, 27, 46, 0.1) 1px,
          transparent 1px
        ),
        linear-gradient(to bottom, rgba(14, 27, 46, 0.1) 1px, transparent 1px);
      background-repeat: repeat;
      background-size: 10px 10px;
      border: 1px solid rgba(14, 27, 46, 1);

      &.bg-white {
        background: #fff;
      }

      &.bg-black {
        background: #111;
      }
    }
  }

  .img-load-err {
    width: 100%;
    height: 100%;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .none {
    display: none;
  }
}
.el-dropdown-menu.cus-dropdown-menu-drop {
  padding: 4px !important;

  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    font-weight: 400;

    &:hover {
      background: #f2f6ff;
      border-radius: 1px;
      font-weight: 400;

      .bg-text {
        color: #005bff;
      }
    }

    .bg-text {
      color: rgba(0, 0, 0, 0.85);
    }

    .bg-icon {
      width: 16px;
      height: 16px;
      border: 1px solid #252526;
      border-radius: 100%;
      box-sizing: border-box;
      margin-left: 21px;
      overflow: hidden;
    }

    .bg-icon-opacity {
      // background: linear-gradient(to right, rgba(14, 27, 46, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(14, 27, 46, 0.1) 1px, transparent 1px);
      background: linear-gradient(
          to right,
          rgba(14, 27, 46, 0.1) 1px,
          transparent 1px
        ),
        linear-gradient(to bottom, rgba(14, 27, 46, 0.1) 1px, transparent 1px);
      background-repeat: repeat;
      background-size: 3px 3px;
      overflow: hidden;
    }

    .bg-icon-black {
      background: black;
    }

    .bg-icon-white {
      background: #fff;
    }
  }
}
</style>