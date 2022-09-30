
<template>
  <div id="app">
    <div class="test-demo-page">
      <div class="test-demo-page-content">
        <SvgLabel
          :img="img"
          :is-lock="false"
          :init-data="initData"
          :upload="upload" />
      </div>
    </div>
  </div>
</template>

<script>
import SvgLabel from '@/svg-label'

// 测试数据
import testData from './test-data'

export default{
  name: 'App',
  components: {
    SvgLabel
  },
  data() {
    return {
      initData: testData,
      img: 'https://t7.baidu.com/it/u=2531125946,3055766435&fm=193&f=GIF'
    }
  },
  methods: {
    async upload() {
      return 'https://t7.baidu.com/it/u=4162611394,4275913936&fm=193&f=GIF'
    }
  }
}
</script>

<style lang="scss">
  @import 'styles/common.scss';

  #app {
    width: 100%;
    height: 100%;

    .test-demo-page {
      width: 100%;
      height: 100%;

      .test-demo-page-content {
        width: 900px;
        height: 500px;
        margin: 0 auto;
      }
    }
  }
</style>
