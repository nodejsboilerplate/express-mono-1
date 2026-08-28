const data = [
  {
    type: "neq",
    data: {
      id: "j24sdljls23dgsd",
      name: "Nimul Islam Mahin",
      age: 20,
    },
  },
  {
    type: "eq",
    data: {
      id: "sjdlsdwgdbdw242",
      name: "Rakibul Islam",
      age: 25,
    },
  },
];

const merge = data.reduce((acc, item) => {
  return { ...acc, ...item.data };
}, {});

console.log(merge)

console.log("Mahin".slice(0, 2))
