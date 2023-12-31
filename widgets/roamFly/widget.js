/* 2017-9-28 16:04:24 | 修改 木遥（微信:  http://marsgis.cn/weixin.html ） */
//模块：
mars3d.widget.bindClass(mars3d.widget.BaseWidget.extend({
    options: {
        //弹窗
        view: {
            type: "window",
            url: "view.html",
            windowOptions: {
                width: 300,
                height: 435,
                position:{
                    top:230,
                    right:100
                }
            }
        },
    },
    //初始化[仅执行1次]
    create: function () {
        // console.log('create fly');
        

    },
    viewWindow: null,
    //每个窗口创建完成后调用
    winCreateOK: function (opt, result) {
        //layer.min(opt._layerIdx); //最小化窗口 
        this.viewWindow = result;
    },
    //打开激活
    activate: function () {
        var lonlats = this.config.data.points;
        if (!lonlats || lonlats.length < 2) {
            toastr.error('路线无坐标数据，无法漫游！');
            return;
        }
        haoutil.storage.add("flystart", true);
        var flyLine = new mars3d.FlyLine(this.viewer, this.config.data);
        this.flyLine = flyLine;

        this.createTimeLine();

        if (this.config.data.clampToGround) {
            var that = this;
            flyLine.clampToGround(function () {//异步计算完成贴地后再启动
                that.startFly();
            });
        }
        else {
            this.startFly();
        }
        this.multiplier=0;
        this.viewer.mars.keyboardRoam.bind();
    },
    startFly: function () {
        var flyLine = this.flyLine;

        //显示基本信息，名称、总长、总时间
        this.viewWindow.showAllInfo({
            name: flyLine.name,
            alllen: flyLine.alllen,
            alltime: flyLine.alltimes
        });
        if (this.viewer.timeline)
            this.viewer.timeline.zoomTo(flyLine.startTime, flyLine.stopTime);
        else if (this.timeline)
            this.timeline.zoomTo(flyLine.startTime, flyLine.stopTime);
           
            flyLine.start();
        // setTimeout(function(){
        //         //执行前显示倾斜摄影
        //         var primitives = this.viewer.scene.primitives._primitives;
        //         for(var i=0;i<primitives.length;i++){
        //             var primitive= primitives[i];
        //             if(primitive.asset){
        //                 if(primitive.asset.nametype=="obliquephotography"){
        //                     primitive.show=true;
        //                 }
        //             }
                    
        //         }
                
        // },500)

        var that = this;
        this.timetik = setInterval(function () {
            if (!that.flyLine.timeinfo) return;

            that.viewWindow.showRealTimeInfo(that.flyLine.timeinfo);
            that.updateCharsWidgeFlyOk(that.flyLine.timeinfo.len);//更新剖面图      

        }, 200);
    },
    //关闭释放
    disable: function () {
        haoutil.storage.add("flystart", false);
        this.viewWindow = null;

        clearInterval(this.timetik);

        this.flyLine.destroy();
        delete this.flyLine;

        this.removeTimeLine();
        this.viewer.mars.keyboardRoam.unbind()
    },
    //界面更新参数
    getAttr: function () {
        return this.flyLine.options;
    },
    updateStyle: function (params) {
        this.flyLine.updateStyle(params);
    },

    //返回列表widget
    toRoamLine: function () {
        this.flyLine.stop();

        mars3d.widget.activate({
            uri: 'widgets/roamLine/widget.js',
        });
    },
    //暂停
    multiplier:0,
    RoamLinepause:function(params){
        if(this.multiplier==0){
            this.flyLine.updateStyle(params);
            this.multiplier = viewer.clock.multiplier;
            viewer.clock.multiplier=0;
        }
    },
    //继续
    RoamLineproceed:function(params){
        if(this.multiplier!=0){
            this.flyLine.updateStyle(params);
            viewer.clock.multiplier=this.multiplier;
            this.multiplier=0;
        } 
    },
    //显示剖面
    charsWidgetUri: 'widgets/roamChars/widget.js',
    showHeightChars: function () {
        var that = this;
        this.flyLine.getTerrainHeight(function (data) {
            that.updateCharsWidge(data);
        }, { splitNum: 100 });
    },
    updateCharsWidge: function (data) {
        mars3d.widget.activate({
            uri: this.charsWidgetUri,
            data: data
        });

        // var roamingJK = mars3d.widget.getClass(this.charsWidgetUri);
        // if (roamingJK && roamingJK.isActivate) { //如果在激活状态直接更新
        //     roamingJK.update(data);
        // }
        // else{
        //     mars3d.widget.activate({ 
        //         uri: this.charsWidgetUri,
        //         data: data
        //     });
        // }
        
    },
    updateCharsWidgeFlyOk: function (alllen) {
        var roamingJK = mars3d.widget.getClass(this.charsWidgetUri);
        if (roamingJK && roamingJK.isActivate) {
            roamingJK.changeFlyOk(alllen);
        }
    },




    //创建时间控制
    createTimeLine: function () {
        var viewerContainer = this.viewer._element;
        if (!this.viewer.animation) {  // Animation 
            var animationContainer = document.createElement('div');
            animationContainer.className = 'cesium-viewer-animationContainer';
            animationContainer.style.display = 'none';
            viewerContainer.appendChild(animationContainer);
            var animation = new Cesium.Animation(animationContainer, new Cesium.AnimationViewModel(this.viewer.clockViewModel));
            //this.animation = animation;
        }
        if (!this.viewer.timeline) {    // Timeline 
            var timelineContainer = document.createElement('div');
            timelineContainer.className = 'cesium-viewer-timelineContainer';
            timelineContainer.style.right = '0px';
            timelineContainer.style.display = 'none';
            viewerContainer.appendChild(timelineContainer);
            var timeline = new Cesium.Timeline(timelineContainer, this.viewer.clock);
            timeline.addEventListener('settime', this.onTimelineScrubfunction, false);
            timeline.zoomTo(this.viewer.clock.startTime, this.viewer.clock.stopTime);
            //this.timeline = timeline;
        }

       // this.locationOldCss = this.viewer.mars.location._dom.css(['left', 'bottom']);
       // this.viewer.mars.location._dom.css({ left: '170px', bottom: '25px' });


        this.legendOldCss = $(".distance-legend").css(['left', 'bottom']);
        $(".distance-legend").css({ "left": "-10px", "bottom": "10px", });
    },
    onTimelineScrubfunction: function (e) {
        var clock = e.clock;
        clock.currentTime = e.timeJulian;
        clock.shouldAnimate = false;
    },
    removeTimeLine: function () {
        if (this.timeline)
            this.timeline.removeEventListener('settime', this.onTimelineScrubfunction, false);

        try {
            var viewerContainer = this.viewer._element;
            if (this.animation) {
                viewerContainer.removeChild(this.animation.container);
                this.animation.destroy();
                this.animation = null;
            }
            if (this.timeline) {
                viewerContainer.removeChild(this.timeline.container);
                this.timeline.destroy();
                this.timeline = null;
            }
            //this.viewer.mars.location._dom.css(this.locationOldCss);
            $(".distance-legend").css(this.legendOldCss);
        }
        catch (e) {
            console.log(e);
        }
    },




}));

