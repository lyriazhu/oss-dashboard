export const MONTHS = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"];
export const QUARTERS = ["Q3 '25","Q4 '25","Q1 '26","Q2 '26"];

export const INITIAL_DATA = {
  camel:{
    name:"Apache Camel", sub:"ASF",
    foundation:"Apache Software Foundation", founded:"Founded 2007",
    status:{label:"Healthy", cls:"green"},
    ov:{foundation:"Apache SF", contributors:"1,500+", companies:"450+", commits:"5,282", pullRequests:"2,450", stars:"6,200+", quarters:[60,64,56,72]},
    kpis:[
      {l:"Contributors YTD", v:"153", h:"72 new · 81 returning"},
      {l:"Companies", v:"450+", h:"Via commit email domains"},
      {l:"Commits YTD", v:"5,282", h:"vs 6,563 in 2024"},
      {l:"GitHub stars", v:"6,200+", h:"5,100+ forks"},
      {l:"Open issues", v:"214", h:"Avg. resolution: 8 days"},
      {l:"New PRs (Q2)", v:"612", h:"Avg. merge time: 3.2 days"},
      {l:"Releases YTD", v:"25", h:"Core + Spring Boot"},
      {l:"CVEs (12 mo.)", v:"2", h:"Both patched"}
    ],
    commits:[{y:"2022",v:62},{y:"2023",v:78},{y:"2024",v:66},{y:"2025",v:53,c:true}],
    quarters:[{q:"Q3 2024",v:60},{q:"Q4 2024",v:64},{q:"Q1 2025",v:56},{q:"Q2 2025",v:72,c:true}],
    prYearly:[{y:"2022",v:520},{y:"2023",v:580},{y:"2024",v:612},{y:"2025",v:450,c:true}],
    prQuarterly:[{q:"Q3 2024",v:140},{q:"Q4 2024",v:152},{q:"Q1 2025",v:138},{q:"Q2 2025",v:162,c:true}],
    issueYearly:[{y:"2022",v:520},{y:"2023",v:580},{y:"2024",v:612},{y:"2025",v:450,c:true}],
    issueQuarterly:[{q:"Q3 2024",v:140},{q:"Q4 2024",v:152},{q:"Q1 2025",v:138},{q:"Q2 2025",v:162,c:true}],
    retention:{returning:53, neu:47, cap:"72 new · 81 returning this year"},
    companies:[
      {n:"Red Hat / IBM", c:"2,100", p:"40%", strong:true},
      {n:"Independent", c:"1,320", p:"25%"},
      {n:"SAP", c:"420", p:"8%"},
      {n:"447+ others", c:"1,442", p:"27%", muted:true}
    ],
    meta:[
      {f:"Total releases", v:"301+"},
      {f:"Known adopters", v:"100+ organizations"},
      {f:"SO questions", v:"11,700+"},
      {f:"AI policy", v:"Documented", flag:true}
    ],
    activity:[44,40,52,38,46,34,55,62,50,68,58,40]
  },
  strimzi:{
    name:"Strimzi", sub:"CNCF Sandbox",
    foundation:"CNCF Sandbox", founded:"Founded 2018",
    status:{label:"Healthy", cls:"green"},
    ov:{foundation:"CNCF Sandbox", contributors:"280+", companies:"45+", commits:"1,840", pullRequests:"1,552", stars:"4,500+", quarters:[58,62,56,70]},
    kpis:[
      {l:"Contributors YTD", v:"88", h:"41 new · 47 returning"},
      {l:"Companies", v:"45+", h:"Via commit email domains"},
      {l:"Commits YTD", v:"1,840", h:"vs 1,720 in 2024"},
      {l:"GitHub stars", v:"4,500+", h:"1,400+ forks"},
      {l:"Open issues", v:"96", h:"Avg. resolution: 6 days"},
      {l:"New PRs (Q2)", v:"388", h:"Avg. merge time: 2.1 days"},
      {l:"Releases YTD", v:"9", h:"Operator + bridge"},
      {l:"CVEs (12 mo.)", v:"1", h:"Patched"}
    ],
    commits:[{y:"2022",v:48},{y:"2023",v:58},{y:"2024",v:60},{y:"2025",v:42,c:true}],
    quarters:[{q:"Q3 2024",v:58},{q:"Q4 2024",v:62},{q:"Q1 2025",v:56},{q:"Q2 2025",v:70,c:true}],
    prYearly:[{y:"2022",v:320},{y:"2023",v:360},{y:"2024",v:388},{y:"2025",v:290,c:true}],
    prQuarterly:[{q:"Q3 2024",v:88},{q:"Q4 2024",v:96},{q:"Q1 2025",v:84},{q:"Q2 2025",v:102,c:true}],
    issueYearly:[{y:"2022",v:320},{y:"2023",v:360},{y:"2024",v:388},{y:"2025",v:290,c:true}],
    issueQuarterly:[{q:"Q3 2024",v:88},{q:"Q4 2024",v:96},{q:"Q1 2025",v:84},{q:"Q2 2025",v:102,c:true}],
    retention:{returning:53, neu:47, cap:"41 new · 47 returning this year"},
    companies:[
      {n:"Red Hat / IBM", c:"860", p:"47%", strong:true},
      {n:"Independent", c:"440", p:"24%"},
      {n:"Lightbend", c:"110", p:"6%"},
      {n:"45+ others", c:"430", p:"23%", muted:true}
    ],
    meta:[
      {f:"Total releases", v:"140+"},
      {f:"Known adopters", v:"60+ organizations"},
      {f:"SO questions", v:"2,300+"},
      {f:"AI policy", v:"Documented", flag:true}
    ],
    activity:[30,34,40,28,36,26,42,48,38,52,46,34]
  },
  debezium:{
    name:"Debezium", sub:"Commonhaus",
    foundation:"Commonhaus Foundation", founded:"Founded 2016",
    status:{label:"Healthy", cls:"green"},
    ov:{foundation:"Commonhaus", contributors:"620+", companies:"80+", commits:"2,100", pullRequests:"2,160", stars:"10,100+", quarters:[60,66,58,74]},
    kpis:[
      {l:"Contributors YTD", v:"134", h:"58 new · 76 returning"},
      {l:"Companies", v:"80+", h:"Via commit email domains"},
      {l:"Commits YTD", v:"2,100", h:"vs 2,040 in 2024"},
      {l:"GitHub stars", v:"10,100+", h:"2,500+ forks"},
      {l:"Open issues", v:"302", h:"Avg. resolution: 11 days"},
      {l:"New PRs (Q2)", v:"540", h:"Avg. merge time: 4.0 days"},
      {l:"Releases YTD", v:"14", h:"Core + connectors"},
      {l:"CVEs (12 mo.)", v:"0", h:"None reported"}
    ],
    commits:[{y:"2022",v:54},{y:"2023",v:64},{y:"2024",v:62},{y:"2025",v:58,c:true}],
    quarters:[{q:"Q3 2024",v:60},{q:"Q4 2024",v:66},{q:"Q1 2025",v:58},{q:"Q2 2025",v:74,c:true}],
    prYearly:[{y:"2022",v:450},{y:"2023",v:520},{y:"2024",v:540},{y:"2025",v:410,c:true}],
    prQuarterly:[{q:"Q3 2024",v:125},{q:"Q4 2024",v:135},{q:"Q1 2025",v:120},{q:"Q2 2025",v:145,c:true}],
    issueYearly:[{y:"2022",v:450},{y:"2023",v:520},{y:"2024",v:540},{y:"2025",v:410,c:true}],
    issueQuarterly:[{q:"Q3 2024",v:125},{q:"Q4 2024",v:135},{q:"Q1 2025",v:120},{q:"Q2 2025",v:145,c:true}],
    retention:{returning:57, neu:43, cap:"58 new · 76 returning this year"},
    companies:[
      {n:"Red Hat / IBM", c:"880", p:"42%", strong:true},
      {n:"Independent", c:"546", p:"26%"},
      {n:"Decodable", c:"168", p:"8%"},
      {n:"80+ others", c:"506", p:"24%", muted:true}
    ],
    meta:[
      {f:"Total releases", v:"220+"},
      {f:"Known adopters", v:"90+ organizations"},
      {f:"SO questions", v:"4,800+"},
      {f:"AI policy", v:"Documented", flag:true}
    ],
    activity:[40,44,50,42,48,38,54,58,46,60,52,44]
  },
  apicurio:{
    name:"Apicurio Registry", sub:"Red Hat/IBM",
    foundation:"Red Hat / IBM sponsored", founded:"Founded 2017",
    status:{label:"Watch", cls:"yellow"},
    ov:{foundation:"Red Hat/IBM", contributors:"120+", companies:"18+", commits:"980", pullRequests:"448", stars:"1,100+", quarters:[56,60,52,66]},
    kpis:[
      {l:"Contributors YTD", v:"47", h:"19 new · 28 returning"},
      {l:"Companies", v:"18+", h:"Via commit email domains"},
      {l:"Commits YTD", v:"980", h:"vs 1,320 in 2024"},
      {l:"GitHub stars", v:"1,100+", h:"260+ forks"},
      {l:"Open issues", v:"148", h:"Avg. resolution: 19 days"},
      {l:"New PRs (Q2)", v:"112", h:"Avg. merge time: 6.4 days"},
      {l:"Releases YTD", v:"6", h:"Registry v3"},
      {l:"CVEs (12 mo.)", v:"1", h:"Patched"}
    ],
    commits:[{y:"2022",v:46},{y:"2023",v:52},{y:"2024",v:48},{y:"2025",v:30,c:true}],
    quarters:[{q:"Q3 2024",v:56},{q:"Q4 2024",v:60},{q:"Q1 2025",v:52},{q:"Q2 2025",v:66,c:true}],
    prYearly:[{y:"2022",v:95},{y:"2023",v:108},{y:"2024",v:112},{y:"2025",v:85,c:true}],
    prQuarterly:[{q:"Q3 2024",v:26},{q:"Q4 2024",v:28},{q:"Q1 2025",v:24},{q:"Q2 2025",v:30,c:true}],
    issueYearly:[{y:"2022",v:95},{y:"2023",v:108},{y:"2024",v:112},{y:"2025",v:85,c:true}],
    issueQuarterly:[{q:"Q3 2024",v:26},{q:"Q4 2024",v:28},{q:"Q1 2025",v:24},{q:"Q2 2025",v:30,c:true}],
    retention:{returning:60, neu:40, cap:"19 new · 28 returning this year"},
    companies:[
      {n:"Red Hat / IBM", c:"637", p:"65%", strong:true},
      {n:"Independent", c:"176", p:"18%"},
      {n:"Aiven", c:"69", p:"7%"},
      {n:"18+ others", c:"98", p:"10%", muted:true}
    ],
    meta:[
      {f:"Total releases", v:"70+"},
      {f:"Known adopters", v:"30+ organizations"},
      {f:"SO questions", v:"410+"},
      {f:"AI policy", v:"Not documented", flag:false}
    ],
    activity:[28,24,30,22,26,18,24,20,16,22,18,14]
  },
  streamshub:{
    name:"StreamsHub", sub:"Self-governed",
    foundation:"Self-governed community", founded:"Founded 2024",
    status:{label:"Growing", cls:"blue"},
    ov:{foundation:"Self-governed", contributors:"35+", companies:"8+", commits:"420", pullRequests:"344", stars:"280+", quarters:[40,44,42,68]},
    kpis:[
      {l:"Contributors YTD", v:"22", h:"15 new · 7 returning"},
      {l:"Companies", v:"8+", h:"Via commit email domains"},
      {l:"Commits YTD", v:"420", h:"First full year"},
      {l:"GitHub stars", v:"280+", h:"40+ forks"},
      {l:"Open issues", v:"73", h:"Avg. resolution: 14 days"},
      {l:"New PRs (Q2)", v:"86", h:"Avg. merge time: 3.8 days"},
      {l:"Releases YTD", v:"4", h:"Console + operators"},
      {l:"CVEs (12 mo.)", v:"0", h:"None reported"}
    ],
    commits:[{y:"2022",v:0},{y:"2023",v:0},{y:"2024",v:34},{y:"2025",v:48,c:true}],
    quarters:[{q:"Q3 2024",v:40},{q:"Q4 2024",v:44},{q:"Q1 2025",v:42},{q:"Q2 2025",v:68,c:true}],
    prYearly:[{y:"2022",v:0},{y:"2023",v:0},{y:"2024",v:72},{y:"2025",v:86,c:true}],
    prQuarterly:[{q:"Q3 2024",v:18},{q:"Q4 2024",v:20},{q:"Q1 2025",v:22},{q:"Q2 2025",v:26,c:true}],
    issueYearly:[{y:"2022",v:0},{y:"2023",v:0},{y:"2024",v:72},{y:"2025",v:86,c:true}],
    issueQuarterly:[{q:"Q3 2024",v:18},{q:"Q4 2024",v:20},{q:"Q1 2025",v:22},{q:"Q2 2025",v:26,c:true}],
    retention:{returning:32, neu:68, cap:"15 new · 7 returning this year"},
    companies:[
      {n:"Red Hat / IBM", c:"269", p:"64%", strong:true},
      {n:"Independent", c:"97", p:"23%"},
      {n:"Scholz Group", c:"25", p:"6%"},
      {n:"8+ others", c:"29", p:"7%", muted:true}
    ],
    meta:[
      {f:"Total releases", v:"12"},
      {f:"Known adopters", v:"15+ organizations"},
      {f:"SO questions", v:"60+"},
      {f:"AI policy", v:"In progress", flag:false}
    ],
    activity:[12,16,20,18,24,22,30,34,28,38,32,26]
  }
};

export const INITIAL_ORDER = ["camel","strimzi","debezium","apicurio","streamshub"];

export const maxOf = (a) => Math.max(...a, 1);
