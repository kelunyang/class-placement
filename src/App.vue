<template>
  <v-app>
    <v-sheet class='d-flex flex-column'>
      <v-dialog
        v-model="specialW"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-card>
          <v-toolbar
            dark
            color="primary"
          >
            <v-btn
              icon
              dark
              @click="buildcourseDetail"
            >
              <v-icon>fa-times-circle</v-icon>
            </v-btn>
            <v-toolbar-title>設定{{ currentCourse.name }}課程的細部參數</v-toolbar-title>
          </v-toolbar>
          <v-card-text class='d-flex flex-column ma-1'>
            <v-alert type="error" icon="fa-info">請注意，設定好細部參數的課程無法復原，只能重新開啟程式再次載入參數！</v-alert>
            <div class='text-body-1'>擋修課程名稱</div>
            <v-alert type="info" icon="fa-info">
              這個功能是用來阻止上下學期重複選課，你可以用分號區隔多個課，如：「基礎電學;物件導向程式設計」，如果你只是要阻止學生選同名課，請不要設定這顆按鈕，直接開啟同名課過濾器即可
            </v-alert>
            <v-text-field
              label="請輸入你要阻止的上學期課程名稱，可以用;區隔"
              solo
              v-model="currentCourse.blockWish"
            ></v-text-field>
            <div class='text-body-1'>合併這堂課{{ mergeWish[0] }}到{{ mergeWish[1] }}的志願序（影響{{ effectStudents }}人）</div>
            <v-alert type="info" icon="fa-info">
              這個功能可以讓你把某堂課中指定志願序的學生清單合併起來
            </v-alert>
            <v-range-slider
              v-model="mergeWish"
              hint="預設值為1到1（也就是不啟動）"
              thumb-label
              :max="currentCourse.placements.length"
              min="1"
            ></v-range-slider>
            <div class='text-body-1'>載入選課積分</div>
            <v-alert type="info" icon="fa-info">
              <v-row>
                <v-col class='grow'>
                  選課積分的意思是如果你這堂課是要按照某些分數來排序，那你就提供一個「唯一值（如學號）-積分」的表格，系統會讀入
                </v-col>
                <v-col class='shrink'>
                  <v-btn @click='downloadCSV(sampleRanking,"範例課程積分")'>按此下載範例</v-btn>
                </v-col>
              </v-row>
            </v-alert>
            <v-file-input accept="text/csv" prepend-icon='fa-file-csv' outlined v-model="rankingFile" placeholder="請選擇學生選課積分CSV匯出檔案"/>
            <div class='text-body-1' v-if='rankingData.length > 0'>設定欄位對應</div>
            <v-select
              v-if='rankingData.length > 0'
              :items="rankingHeaders"
              v-model="uniqrankingField"
              outlined
              label="唯一值欄位（通常是學號、身分證之類的）"
              hint="唯一值就是不能重複的東西，而且要跟你在學生資料庫設定的唯一值一樣"
            ></v-select>
            <v-select
              v-if='rankingData.length > 0'
              :items="rankingHeaders"
              v-model="rankingscoreField"
              outlined
              label="課程積分欄位"
              hint="就是分數啦"
            ></v-select>
            <div class='text-body-1' v-if='currentCourse.rankingList.length > 0'>已載入的選課積分</div>
            <v-simple-table v-if='currentCourse.rankingList.length > 0'>
              <template v-slot:default>
                <thead>
                  <tr>
                    <th
                      class="text-center"
                    >
                      學生唯一值
                    </th>
                    <th
                      class="text-center"
                    >
                      積分
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="rank in currentCourse.rankingList"
                    :key="rank.student.id + currentCourse.id + 'rankingTable'"
                  >
                    <td>{{ rank.student.id }}（{{ rank.student.name }}）</td>
                    <td>{{ rank.score }}</td>
                  </tr>
                </tbody>
              </template>
            </v-simple-table>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="studentDataW"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-card>
          <v-toolbar
            dark
            color="primary"
          >
            <v-btn
              icon
              dark
              @click="buildstudentList"
            >
              <v-icon>fa-times-circle</v-icon>
            </v-btn>
            <v-toolbar-title>選擇學生選課問卷CSV匯出檔案並讀入</v-toolbar-title>
          </v-toolbar>
          <v-card-text class='d-flex flex-column ma-1'>
            <v-alert type="info" icon="fa-info" v-if='studentList.length === 0'>
              請先準備好學生選課問卷CSV匯出檔案，也就是把學生選課的Google問卷輸出成CSV即可
            </v-alert>
            <v-alert type="info" icon="fa-info" v-if='studentData.length > 0'>一共讀入了{{ courseData.length }}行資料，請在下方設定好欄位對應</v-alert>
            <v-alert type="error" icon="fa-skull" v-if='studentError !== ""'>{{ courseError }}</v-alert>
            <v-file-input accept="text/csv" prepend-icon='fa-file-csv' outlined v-model="studentFile" placeholder="請選擇學生選課問卷CSV匯出檔案"/>
            <div class='text-body-1' v-if='studentData.length > 0'>設定欄位對應</div>
            <v-alert type="info" icon="fa-info" v-if='studentData.length > 0'>特別提醒，你應該善用Google問卷強迫登入後產生在匯出檔第一欄的Email，那一定等於學校開給學生的學號Email，然後從校務行政系統會出學生的學籍，放到Excel用vlookup反查學生資訊，如果你讓學生自己填寫班級座號，那反而是不可信的（不過系統還是保留了這幾個欄位）</v-alert>
            <v-select
              v-if='studentData.length > 0'
              :items="studentHeaders"
              v-model="studentidField"
              outlined
              label="唯一值欄位（通常是學號、身分證之類的）"
              hint="唯一值就是不能重複的東西，通常建議你用Google問卷自動填入的學生登入帳號，這樣必然就是資訊組設定好的學號Email了，或者你找一個不會重複的值當作唯一值"
            ></v-select>
            <v-select
              v-if='studentData.length > 0'
              :items="studentHeaders"
              v-model="polltickField"
              outlined
              label="學生選課時間欄位"
              hint="學生選課時間"
            ></v-select>
            <v-select
              v-if='studentData.length > 0'
              :items="studentHeaders"
              v-model="studentnameField"
              outlined
              label="學生姓名欄位"
              hint="學生姓名"
            ></v-select>
            <v-select
              v-if='studentData.length > 0'
              :items="studentHeaders"
              v-model="studentclassField"
              outlined
              label="學生班級欄位"
              hint="學生班級"
            ></v-select>
            <v-select
              v-if='studentData.length > 0'
              :items="studentHeaders"
              v-model="studentnoField"
              outlined
              label="學生座號欄位"
              hint="學生座號"
            ></v-select>
            <v-select
              v-if='studentData.length > 0'
              :items="studentHeaders"
              v-model="studentlasttakenField"
              outlined
              label="學生上一次選課結果欄位"
              hint="學生上次選課結果"
            ></v-select>
            <v-select
              v-for='place in placements'
              :key='place.id'
              :items="studentHeaders"
              v-model="place.takenField"
              v-show='studentData.length > 0'
              outlined
              :label="'第'+place.count+'次選課志願'"
              hint="學生選課志願"
            ></v-select>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="courseDataW"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-card>
          <v-toolbar
            dark
            color="primary"
          >
            <v-btn
              icon
              dark
              @click="buildcourseList"
            >
              <v-icon>fa-times-circle</v-icon>
            </v-btn>
            <v-toolbar-title>選擇課程清單CSV檔案並讀入</v-toolbar-title>
          </v-toolbar>
          <v-card-text class='d-flex flex-column ma-1'>
            <v-alert type="info" icon="fa-info" v-if='courseData.length === 0'>
              <v-row>
                <v-col class='grow'>
                  請先準備好課程清單檔案，用Excel或Google Spreadsheet輸出成CSV格式
                </v-col>
                <v-col class='shrink'>
                  <v-btn @click='downloadCSV(sampleCourses,"範例課程清單")'>按此下載範例</v-btn>
                </v-col>
              </v-row>
            </v-alert>
            <v-alert type="info" icon="fa-info" v-if='courseData.length > 0'>一共讀入了{{ courseData.length }}行資料，請在下方設定好欄位對應</v-alert>
            <v-alert type="error" icon="fa-skull" v-if='courseError !== ""'>{{ courseError }}</v-alert>
            <v-file-input accept="text/csv" prepend-icon='fa-file-csv' outlined v-model="courseFile" placeholder="請選擇課程清單CSV檔案"/>
            <div class='text-body-1' v-if='courseData.length > 0'>設定欄位對應</div>
            <v-select
              v-if='courseData.length > 0'
              :items="courseHeaders"
              v-model="courseidField"
              outlined
              label="課號欄位"
              hint="課號必須是唯一值，這個欄位在系統中沒有什麼功能，只是方便你之後在excel裡面做vlookup而已"
            ></v-select>
            <v-select
              v-if='courseData.length > 0'
              :items="courseHeaders"
              v-model="coursenameField"
              outlined
              label="班級名稱欄位"
              hint="班級名稱"
            ></v-select>
            <v-select
              v-if='courseData.length > 0'
              :items="courseHeaders"
              v-model="limitField"
              outlined
              label="人數限制欄位"
              hint="人數限制就是這堂課能允許多少人選課的意思"
            ></v-select>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="allocateCountsW"
        width="50vw"
      >
        <v-card>
          <v-card-title class="text-h5" color="primary">
            分發次數({{ allocateCounts }})
          </v-card-title>

          <v-card-text>
            <v-slider
              v-model="allocateCounts"
              hint="預設值為1"
              thumb-label
              max="20"
              min="1"
            ></v-slider>
          </v-card-text>
          <v-divider></v-divider>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="deep-orange darken-4"
              text
              @click="allocateCountsW = false"
            >
              關閉對話框
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="blackListW"
        width="50vw"
      >
        <v-card>
          <v-card-title class="text-h5" color="primary">
            黑名單人數({{ blackList.length }})
          </v-card-title>

          <v-card-text>
            <v-alert type="info" icon="fa-info">黑名單檔案就是一堆學生的學號，全部放在Excel的A欄，循序向下輸入即可</v-alert>
            <v-file-input accept="text/csv" prepend-icon='fa-file-csv' outlined v-model="blacklistFile" placeholder="請選擇黑名單CSV檔案"/>
          </v-card-text>
          <v-divider></v-divider>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              text
              @click="blackListW = false"
            >
              關閉對話框
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="firsttimeW"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-card>
          <v-toolbar
            dark
            color="primary"
          >
            <v-btn
              icon
              dark
              @click="firsttimeW = false"
            >
              <v-icon>fa-times-circle</v-icon>
            </v-btn>
            <v-toolbar-title>使用說明</v-toolbar-title>
          </v-toolbar>
          <v-card-text class='d-flex flex-column ma-1'>
            <v-alert type="info" icon="fa-info">如果你完全理解該怎麼匯入，請按左上角X關閉說明</v-alert>
            <p>本程式的GitHub網址： https://github.com/kelunyang/class-placement ，你可以在這裡觀察看看有沒有更新檔以及原始碼</p>
            <p>要使用本程式，你需要準備至少以下兩個東西（放心，都有範例可以下載的）</p>
            <ol>
              <li>課程清單</li>
              <li>學生選課清單</li>
            </ol>
            <p>本程式識別學生的方式由你決定，你得找一個可以代表學生的唯一值，可能是學號、也可能是身分證字號，這裡最推薦強制學生用學校信箱登入Google問卷再填寫，這樣必然就會帶入學號了（如下圖）</p>
            <img src='@/assets/formhelp.png' />
            <p>學生選課清單是由Google問卷匯出的步驟請看下圖</p>
            <img src='@/assets/csvhelp.png' />
            <p>如果你程式都執行完了，你會得到一份選課清單的CSV檔案，Excel可開啟，如果你需要用那些學號去對應查出更多東西，你可能需要使用Excel的VLookup函式，請自己Google「Vlookup + 教學」吧，很簡單的</p>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-row class='mb-1 pa-2'>
        <v-col class='blue darken-4 justify-space-between flex-row align-content-space-between'>
          <div class='text-caption white--text ma-1 text-left'>課程/可選課人數</div>
          <div class='text-h4 white--text ma-1 text-center'>{{ courseList.length }}/{{ avaiableSlots }}</div>
          <v-btn @click="courseDataW = true" class='red darken-4 white--text ma-1'>{{ courseList.length > 0 ? '重建' : '讀入' }}課程清單</v-btn>
        </v-col>
        <v-col class='blue darken-4 justify-space-between flex-row align-content-space-between'>
          <div class='text-caption white--text ma-1 text-left'>分發次數</div>
          <div class='text-h4 white--text text-center'>{{ allocateCounts }}</div>
          <v-btn @click="allocateCountsW = true" class='red darken-4 white--text ma-1'>設定分發次數</v-btn>
        </v-col>
        <v-col class='blue darken-4 justify-space-between flex-row align-content-space-between'>
          <div class='text-caption white--text ma-1 text-left'>選課黑名單數</div>
          <div class='text-h4 white--text ma-1 text-center'>{{ blackList.length }}</div>
          <v-btn @click="blackListW = true" class='red darken-4 white--text ma-1'>設定選課黑名單</v-btn>
        </v-col>
        <v-col class='blue darken-4 justify-space-between flex-row align-content-space-between'>
          <div class='text-caption white--text ma-1 text-left'>不重複學生選課數</div>
          <div class='text-h4 white--text ma-1 text-center'>{{ studentList.length }}</div>
          <v-btn @click="studentDataW = true" class='red darken-4 white--text ma-1'>{{ studentList.length > 0 ? '重建' : '讀入' }}學生選課清單</v-btn>
        </v-col>
        <v-col class='blue darken-4 justify-space-between flex-row align-content-space-between'>
          <div class='text-caption white--text ma-1 text-left'>是否擋修上學期同課名</div>
          <div class='text-h4 white--text ma-1 text-center'>{{ preventSame ? "是" : "否" }}</div>
          <v-btn @click="preventSame = !preventSame" class='red darken-4 white--text ma-1'>{{ preventSame ? "關閉" : "啟動" }}過濾</v-btn>
        </v-col>
        <v-col v-if='studentList.length > 0' class='blue darken-4 justify-space-between flex-row align-content-space-between'>
          <div class='text-caption white--text ma-1 text-left'>未完成分發數</div>
          <div class='text-h4 white--text ma-1 text-center'>{{ unAllocated }}</div>
          <v-btn v-if='allocationDone' @click="forceAllocation" class='red darken-4 white--text ma-1'>系統強制分發</v-btn>
        </v-col>
      </v-row>
      <v-btn v-show='!allocationDone' @click="startAllocation" :disabled='studentList.length === 0 && courseList.length === 0' class='indigo darken-4 white--text ma-1'>啟動分發</v-btn>
      <v-btn v-show='allocationDone' @click='exportAllocation' :disabled='studentList.length === 0 && courseList.length === 0' class='indigo darken-4 white--text ma-1'>匯出選課結果</v-btn>
      <v-alert type="info" icon="fa-info" v-if='placements.length > 0'>
        <ol>
          <li>表格中志願序的1,2,3,4裡的人數，指的是學生選這堂課列入其指定志願序的人數，請解讀為A課程的第1志願序有10人選課</li>
          <li>如果你要設定細部參數，請點每個課程前面的齒輪圖案，下載該課程的選課列表，選下載圖案</li>
        </ol>
      </v-alert>
      <v-alert type="warning" icon="fa-info" v-if='bgPlacement'>
        選課清單讀入完成，開始注入學生志願序至各課程
      </v-alert>
      <v-alert type="warning" icon="fa-info" v-if='bgAllocation'>
        進行開始選課作業
      </v-alert>
      <v-simple-table v-if='courseList.length > 0'>
        <template v-slot:default>
          <thead>
            <tr>
              <th
                class="text-center"
              >
                &nbsp;
              </th>
              <th
                class="text-center"
              >
                課名
              </th>
              <th
                class="text-center"
              >
                已選人數/上限
              </th>
              <th
                class="text-center"
                v-for='place in placements'
                :key="place.id"
              >
                {{ place.count }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="course in courseList"
              :key="course.id"
              :class='course.special ? "red lighten-5" : ""'
            >
              <td>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      outlined
                      icon
                      @click="setSpecial(course)"
                      class='ma-1 '
                      v-bind="attrs"
                      v-on="on"
                      color="blue-grey darken-4"
                    >
                      <v-icon x-small>fa-cog</v-icon>
                    </v-btn>
                  </template>
                  <span>細部設定</span>
                </v-tooltip>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      outlined
                      icon
                      @click="exportCourse(course)"
                      class='ma-1'
                      v-bind="attrs"
                      v-on="on"
                      color="blue-grey darken-4"
                    >
                      <v-icon x-small>fa-users</v-icon>
                    </v-btn>
                  </template>
                  <span>下載班級名單</span>
                </v-tooltip>
              </td>
              <td>{{ course.name }}</td>
              <td>{{ course.selectedStd.length }}/{{ course.limit }}</td>
              <td v-for='placement in course.placements' :key='placement.id'>{{ placement.students.length }}</td>
            </tr>
          </tbody>
        </template>
      </v-simple-table>
    </v-sheet>
  </v-app>
</template>

<style>
@import url('https://fonts.googleapis.com/css?family=Noto+Sans+TC:100,300,400,500,700,900&display=swap');
html {
  scroll-behavior: smooth;
}
#app {
  font-family: 'Noto Sans TC', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
h1 {
  font-family: 'Noto Sans TC', sans-serif;
  font-weight: 900;
}
</style>

<script>
import _ from 'lodash';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import '@fortawesome/fontawesome-free/css/all.css';
import '@fortawesome/fontawesome-free/js/all.js';
import iconv from 'iconv-lite';
import jschardet from "jschardet";
import placementWorker from 'workerize-loader!./placementWorker'

export default {
  name: "class-placement",
  components: {
  },
  methods: {
    exportCourse: function(course) {
      let exportList = [];
      for(let i=0; i<course.selectedStd.length; i++) {
        let student = course.selectedStd[i];
        exportList.push({
          "學生唯一值": student.id,
          "學生姓名": student.name,
          "學生班級": student.class,
          "學生座號": student.no,
          "在哪個順位選到課": student.selectedOrder
        });
      }
      exportList = _.orderBy(exportList, ["學生唯一值"], ["asc"]); 
      this.downloadCSV(exportList, course.name + "班級名單");
    },
    exportAllocation: function() {
      let exportList = [];
      for(let i=0; i<this.studentList.length; i++) {
        let student = this.studentList[i];
        exportList.push({
          "學生唯一值": student.id,
          "學生姓名": student.name,
          "學生班級": student.class,
          "學生座號": student.no,
          "在哪個順位選到課": student.selectedOrder,
          "選到的課程ID": student.selectedCourse.id,
          "選到的課程名稱": student.selectedCourse.name
        });
      }
      exportList = _.orderBy(exportList, ["選到的課程ID"], ["asc"]); 
      this.downloadCSV(exportList, "選課結果");
    },
    buildcourseDetail: function() {
      if(this.currentCourse.blockWish !== "") {
        let blockList = this.currentCourse.blockWish.split(';');
        for(let i=0; i<this.currentCourse.placements.length; i++) {
          let placement = this.currentCourse.placements[i].students;
          this.currentCourse.placements[i].students = _.filter(placement, (student) => {
            return (_.filter(blockList, (block) => {
              return student.lastTaken === block;
            })).length === 0;
          });
        }
        this.currentCourse.special = true;
      }
      if(this.mergeWish[0] !== this.mergeWish[1]) {
        let students = [];
        for(let p=this.mergeWish[0] - 1; p<=this.mergeWish[1] - 1; p++) {
          students = _.unionWith(students, this.currentCourse.placements[p].students, (aStd, bStd) => {
            return aStd.id === bStd.id;
          });
          this.currentCourse.placements[p].students = [];
        }
        this.currentCourse.placements[this.mergeWish[0] - 1].students = students;
        this.currentCourse.special = true;
      }
      if(this.rankingData.length > 0) {
        this.currentCourse.rankingList = [];
        for(let i=0; i<this.rankingData.length; i++) {
          let ranking = this.rankingData[i];
          let id = ranking[this.rankingHeaders[this.uniqrankingField].text];
          let foundStudent = _.find(this.studentList, (student) => {
            return student.id === id;
          });
          if(foundStudent !== undefined) {
            this.currentCourse.rankingList.push({
              student: foundStudent,
              score: parseInt(ranking[this.rankingHeaders[this.rankingscoreField].text], 10)
            });
          }
        }
        this.currentCourse.special = true;
      }
      this.specialW = false;
    },
    setSpecial: function(course) {
      this.currentCourse = course;
      this.mergeWish = [1, 1];
      this.uniqrankingField = 0;
      this.uniqrankingField = 0;
      this.rankingHeaders = [];
      this.rankingFile = undefined;
      this.rankingData = [];
      this.courseData = [];
      this.specialW = true;
    },
    startAllocation: async function() {
      let instance = placementWorker();
      this.bgAllocation = true;
      this.courseList = await instance.startAllocation(this.courseList, this.preventSame);
      this.studentList = await instance.studentMapping(this.courseList, this.studentList);
      this.bgAllocation = false;
      this.allocationDone = true;
    },
    forceAllocation: async function() {
      let instance = placementWorker();
      this.bgAllocation = true;
      this.courseList = await instance.forceAllocation(this.courseList, this.studentList);
      this.studentList = await instance.studentMapping(this.courseList, this.studentList);
      this.bgAllocation = false;
    },
    buildcourseList: function () {
      this.courseList = [];
      for(let i=0; i<this.courseData.length; i++) {
        let course = this.courseData[i];
        this.courseList.push({
          id: course[this.courseHeaders[this.courseidField].text],
          name: course[this.courseHeaders[this.coursenameField].text],
          limit: parseInt(course[this.courseHeaders[this.limitField].text], 10),
          rankingList: [],
          special: false,
          selectedStd: [],
          placements: [],
          blockWish: ""
        });
      }
      this.allocateCounts = 1;
      this.courseFile = undefined;
      this.courseData = [];
      this.courseDataW = false;
    },
    buildstudentList: async function() {
      this.studentList = [];
      for(let i=0; i<this.studentData.length; i++) {
        let data = this.studentData[i];
        let student = {
          tick: dayjs(data[this.studentHeaders[this.polltickField].text]).unix(),
          id: data[this.studentHeaders[this.studentidField].text],
          name: data[this.studentHeaders[this.studentnameField].text],
          class: data[this.studentHeaders[this.studentclassField].text],
          no: data[this.studentHeaders[this.studentnoField].text],
          lastTaken: data[this.studentHeaders[this.studentlasttakenField].text],
          selectedOrder: 0,
          selectedCourse: undefined,
          wishes: []
        };
        if(student.id === "") continue;
        for(let k=0; k<this.placements.length; k++) {
          let placementField = this.placements[k].takenField;
          student.wishes.push(data[this.studentHeaders[placementField].text]);
        }
        this.studentList.push(student);
      }
      this.studentList = _.orderBy(this.studentList, ['tick'], ['desc']);
      this.studentList = _.uniqWith(this.studentList, (a, b) => {
        return a.id === b.id;
      });
      this.studentList = _.differenceWith(this.studentList, this.blackList, (student, black) => {
        return student.id === black;
      });
      this.bgPlacement = true;
      let instance = placementWorker();
      this.courseList = await instance.detectSelection(this.courseList, this.studentList);
      this.studentList = await instance.studentMapping(this.courseList, this.studentList);
      this.studentFile = undefined;
      this.studentData = [];
      this.bgPlacement = false;
      this.studentDataW = false;
    },
    downloadCSV: function(arr, filename) {
      let output = "\ufeff"+ Papa.unparse(arr);
      let element = document.createElement('a');
      let blob = new Blob([output], { type: 'text/csv' });
      let url = window.URL.createObjectURL(blob);
      element.setAttribute('href', url);
      element.setAttribute('download', filename + ".csv");
      element.click();
    }
  },
  computed: {
    avaiableSlots: function() {
      return _.sumBy(this.courseList, (course) => {
        return course.limit;
      });
    },
    effectStudents: function() {
      let students = [];
      for(let p=this.mergeWish[0] - 1; p<this.mergeWish[1] - 1; p++) {
        students = _.unionWith(students, this.currentCourse.placements[p], (aStd, bStd) => {
          return aStd.id === bStd.id;
        });
      }
      return students.length;
    },
    unAllocated: function() {
      return _.sumBy(this.studentList, (student) => {
        return student.selectedOrder === 0 ? 1 : 0;
      });
    }
  },
  watch: {
    allocateCounts: function() {
      this.placements = [];
      for(let i=0; i<this.allocateCounts; i++) {
        this.placements.push({
          id: uuidv4(),
          count: i+1,
          takenField: 0
        })
      }
      for(let i=0; i<this.courseList.length; i++) {
        let course = this.courseList[i];
        course.placements = [];
        for(let k=0; k<this.placements.length; k++) {
          let place = this.placements[k];
          course.placements.push({
            id: uuidv4(),
            pid: place.id,
            count: 0,
            students: []
          });
        }
      }
    },
    blacklistFile: {
      immediate: true,
      async handler () {
        let oriobj = this;
        if (this.blacklistFile !== undefined) {
          let reader = new FileReader();
          reader.readAsBinaryString(oriobj.blacklistFile);
          reader.onload = ((file) => {
            try {
              let encoding = jschardet.detect(file.target.result);
              let content = iconv.decode(file.target.result, encoding.encoding);
              oriobj.csvError = '';
              Papa.parse(content, {
                header: false,
                skipEmptyLines: true,
                complete: async function(result) {
                  if(result.data.length > 0) {
                    oriobj.blackList = _.map(result.data, (item) => {
                      return item[0];
                    });
                  }
                }
              });
            } catch(e) {
              console.dir(e);
            }
          });
        }
      }
    },
    rankingFile: {
      immediate: true,
      async handler () {
        let oriobj = this;
        if (this.rankingFile !== undefined) {
          let reader = new FileReader();
          reader.readAsBinaryString(oriobj.rankingFile);
          reader.onload = ((file) => {
            try {
              let encoding = jschardet.detect(file.target.result);
              let content = iconv.decode(file.target.result, encoding.encoding);
              oriobj.rankingError = '';
              Papa.parse(content, {
                header: false,
                skipEmptyLines: true,
                complete: async function(result) {
                  if(result.data.length > 0) {
                    let headers = result.data[0];
                    oriobj.rankingHeaders = [];
                    for(let i=0; i<headers.length; i++) {
                      oriobj.rankingHeaders.push({
                        text: headers[i],
                        value: i
                      });
                    }
                  }
                }
              });
              Papa.parse(content, {
                header: true,
                skipEmptyLines: true,
                complete: async function(result) {
                  if(result.data.length > 0) {
                    oriobj.rankingData = result.data;
                  }
                }
              });
            } catch(e) {
              console.dir(e);
            }
          });
        }
      }
    },
    studentFile: {
      immediate: true,
      async handler () {
        let oriobj = this;
        if (this.studentFile !== undefined) {
          let reader = new FileReader();
          reader.readAsBinaryString(oriobj.studentFile);
          reader.onload = ((file) => {
            try {
              let encoding = jschardet.detect(file.target.result);
              let content = iconv.decode(file.target.result, encoding.encoding);
              oriobj.studentError = '';
              Papa.parse(content, {
                header: false,
                skipEmptyLines: true,
                complete: async function(result) {
                  if(result.data.length > 0) {
                    let headers = result.data[0];
                    oriobj.studentHeaders = [];
                    for(let i=0; i<headers.length; i++) {
                      oriobj.studentHeaders.push({
                        text: headers[i],
                        value: i
                      });
                    }
                  }
                }
              });
              Papa.parse(content, {
                header: true,
                skipEmptyLines: true,
                complete: async function(result) {
                  if(result.data.length > 0) {
                    oriobj.studentData = result.data;
                  }
                }
              });
            } catch(e) {
              console.dir(e);
            }
          });
        }
      }
    },
    courseFile: {
      immediate: true,
      async handler () {
        let oriobj = this;
        if (this.courseFile !== undefined) {
          let reader = new FileReader();
          reader.readAsBinaryString(oriobj.courseFile);
          reader.onload = ((file) => {
            try {
              let encoding = jschardet.detect(file.target.result);
              let content = iconv.decode(file.target.result, encoding.encoding);
              oriobj.courseError = '';
              Papa.parse(content, {
                header: false,
                skipEmptyLines: true,
                complete: async function(result) {
                  if(result.data.length > 0) {
                    let headers = result.data[0];
                    oriobj.courseHeaders = [];
                    for(let i=0; i<headers.length; i++) {
                      oriobj.courseHeaders.push({
                        text: headers[i],
                        value: i
                      });
                    }
                  }
                }
              });
              Papa.parse(content, {
                header: true,
                skipEmptyLines: true,
                complete: async function(result) {
                  if(result.data.length > 0) {
                    oriobj.courseData = result.data;
                  }
                }
              });
            } catch(e) {
              console.dir(e);
            }
          });
        }
      }
    }
  },
  data: () => ({
    preventSame: false,
    allocationDone: false,
    bgPlacement: false,
    bgAllocation: false,
    displayRanking: [],
    mergeWish: [1, 1],
    currentCourse: {
      id: 0,
      name: "",
      limit: 0,
      rankingList: [],
      special: false,
      placements: [],
      blockWish: ""
    },
    specialW: true,
    tab: 0,
    polltickField: 0,
    courseidField: 0,
    coursenameField: 0,
    studentidField: 0,
    studentnameField: 0,
    studentclassField: 0,
    studentnoField: 0,
    studentlasttakenField: 0,
    uniqrankingField: 0,
    rankingscoreField: 0,
    limitField: 0,
    courseHeaders: [],
    studentHeaders: [],
    rankingHeaders: [],
    courseData: [],
    rankingData: [],
    courseError: "",
    studentError: "",
    rankingError: '',
    rankingFile: undefined,
    courseFile: undefined,
    studentFile: undefined,
    blacklistFile: undefined,
    firsttimeW: true,
    courseDataW: false,
    courseList: [],
    placements: [],
    studentList: [],
    studentData: [],
    studentDataW: false,
    allocateCounts: 0,
    allocateCountsW: false,
    blackList: [],
    blackListW: false,
    sampleCourses: [
      {
        "課號": 1,
        "課名": "一袋米扛幾樓",
        "限制人數": 10
      },
      {
        "課號": 2,
        "課名": "天竺鼠車車過馬路",
        "限制人數": 7
      }
    ],
    sampleRanking: [
      {
        "唯一值": "B1050003",
        "積分": 100,
      },
      {
        "唯一值": "B1050001",
        "積分": 90,
      },
    ]
  }),
};
</script>
