const express = require('express');
const app = express()
const port = 5002;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const config = require('./config/key');
const { auth } = require('./middleware/auth');
const { User } = require("./models/User");
const cors = require('cors');
const errorController = require("./controllers/errorController");


// applicaton/x-www-form-urlencoded 를 분석해서 가져올 수 있게
app.use(bodyParser.urlencoded({extended: true}));

// application/json 을 분석해서 가져올 수 있게
app.use(bodyParser.json());
app.use(cookieParser());

const corsOptions = {
    origin: 'http://localhost:3000', // 허락하고자 하는 요청 주소
    credentials: true, // true로 하면 설정한 내용을 response 헤더에 추가 해줍니다.
};
app.use(cors(corsOptions)); 

const mongoose = require("mongoose")

mongoose.connect(config.mongoURI, {
    useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false
}).then(() => console.log("MongoDB Connected..."))
.catch(err => console.log(err))


app.use(errorController.pageNotFoundError)
app.use(errorController.respondInternalError)



app.get('/', (req, res) =>
    res.send('HelloWorld')
)

app.post("/api/users/register", (req, res) => {

    const user = new User(req.body) 

    user.save((err, userInfo) => {
        if (err) return res.json({ success: false, err })
        return res.status(200).json({
            success: true
        })
    })
})

app.post('/api/users/login', (req, res) => {
    

    // 요청된 이메일을 데이터베이스에서 있는지 찾는다.
    User.findOne({ email: req.body.email }, (err, user) => {
        
        if(!user) {
            return res.json({
                loginSuccess: false,
                message: "제공된 이메일에 해당하는 유저가 없습니다."
            })
        }
        
        // 요청된 이메일이 데이터 베이스에 있다면 비밀번호가 맞는 비밀번호인지 확인
        user.comparePassword(req.body.password, (err, isMatch) => {
            if(!isMatch)
                return res.json({ loginSuccess: false, message: "비밀번호가 틀렸습니다."})

            // 비밀번호까지 맞다면 토큰을 생성하기.
            user.generateToken((err, user) => {
                if(err) return res.status(400).send(err);

                // 토큰을 저장한다. 어디에 ? 쿠키, 로컬 스토리지
                res.cookie("x_auth", user.token) 
                .status(200)
                .json({ loginSuccess: true, userId: user._id })
            })
        })

    })
})


// role 0 일반유저, role 0이 아니면 관리자
app.get('/api/users/auth', auth, (rqe, res) => {

    // 여기까지 미들웨어를 통과해 왔다는 이야기는 Authentication이 True라는 말.
    res.status(200).json({
        _id: req.user.id,
        isAdmin: req.user.role === 0 ? false : true, 
        isAuth: true,
        email: req.user.email,
        name: req.user.name,
        lastname: req.user.lastname,
        role: req.user.role,
        image: req.user.image
    })

})


app.get('/api/users/logout', auth, (req, res) => {

    User.findOneAndUpdate({_id: req.user._id}, 
        { token: "" }
        , (err, user) => {
            if(err) return res.json({success: false, err});
            return res.status(200).send({
                success: true
             })
        })
})


app.get('/api/hello', (req, res) => {
    res.send("안녕하세요 ~ ")
})


app.listen(port, () => {
    console.log(`server is running on port: ${port}`);
});

