import { createRouter, createWebHistory } from "vue-router";

import Home from "../views/Home.vue";

const routes = [
  { path: "/", component: Home },
  { path: "/guide", component: () => import("../views/Guide.vue") },
  { path: "/experiments", component: () => import("../views/ExperimentList.vue") },
  { path: "/lab/:experimentId", component: () => import("../views/Lab.vue") },
  { path: "/analysis/:recordId", component: () => import("../views/Analysis.vue") },
  { path: "/report/:recordId", component: () => import("../views/Report.vue") },
  { path: "/gallery", component: () => import("../views/Gallery.vue") },
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
