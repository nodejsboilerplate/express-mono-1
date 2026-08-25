const user = {
    user_name: "",
    email: "",
    number: ""
}


const result = Object.fromEntries(
  Object.keys(user).map((key) => [key, user[key]])
);

console.log(result)