import { createRouter, createWebHistory } from "vue-router";

import Home from "../views/Home.vue";
import Guide from "../views/Guide.vue";
import ExperimentList from "../views/ExperimentList.vue";
import Lab from "../views/Lab.vue";
import Analysis from "../views/Analysis.vue";
import Report from "../views/Report.vue";
import Gallery from "../views/Gallery.vue";

const routes = [
  { path: "/", component: Home },
  { path: "/guide", component: Guide },
  { path: "/experiments", component: ExperimentList },
  { path: "/lab/:experimentId", component: Lab },
  { path: "/analysis/:recordId", component: Analysis },
  { path: "/report/:recordId", component: Report },
  { path: "/gallery", component: Gallery },
  {
    path: "/community",
    name: "CommunityList",
    component: () => import("../views/CommunityList.vue")
  },
  {
    path: "/community/:shareId",
    name: "CommunityDetail",
    component: () => import("../views/CommunityDetail.vue")
  },
  {
    path: "/model-import",
    name: "ModelImport",
    component: () => import("../views/ModelImport.vue")
  },
  {
    path: "/records",
    name: "RecordList",
    component: () => import("../views/RecordList.vue")
  }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
