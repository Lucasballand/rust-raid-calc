window.RUST = {
  gunpowder: { sulfur: 2, charcoal: 3 }, // 1 GP = 2 sulfur + 3 charcoal
  explosive: { gunpowder: 50, sulfur: 10, lowgrade: 3, metalfrags: 10 }, // 1 Explosive

  items: [
    {
      id: "rocket",
      name: "Roquette",
      unit: "roquettes",
      img: "assets/items/rocket.png",
      recipe: { explosives: 10, gunpowder: 150, pipes: 2 }
    },
    {
      id: "c4",
      name: "C4",
      unit: "C4",
      img: "assets/items/c4.png",
      recipe: { explosives: 20, cloth: 5, techtrash: 2 }
    },
    {
      id: "explo556",
      name: "Balles explo 5.56",
      unit: "balles",
      output: 2, // 1 craft = 2 balles
      img: "assets/items/explo556.png",
      recipe: { gunpowder: 20, sulfur: 10, metalfrags: 10 }
    },
    {
      id: "beancan",
      name: "Beancan",
      unit: "beancans",
      img: "assets/items/beancan.png",
      recipe: { gunpowder: 60, metalfrags: 20 }
    },
    {
      id: "satchel",
      name: "Satchel",
      unit: "satchels",
      img: "assets/items/satchel.png",
      recipe: { beancan: 4, rope: 1, smallstash: 1 }
    },
    {
      id: "f1",
      name: "F1 Grenade",
      unit: "grenades",
      img: "assets/items/f1.png",
      recipe: { gunpowder: 30, metalfrags: 25 }
    }
  ]
};
