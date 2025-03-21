const express=require('express');
const router=express.Router();
const cloudinary = require('../config/cloudinary');
const upload = require('../middleware/multer');
const fs = require('fs');
const {getDb}=require('./db');



router.post('/upload', upload.single('video'), async (req, res) => {
    try {

      const {title,description}=req.body;
      const email = req.cookies.email;
      const name = req.cookies.name;

      if (!email) {
        return res.status(401).json({ message: "Unauthorized: No email found in cookies" });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
  
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'video',
        folder: 'videos',
      }); 
  
      fs.unlinkSync(req.file.path); 

      const videoData = {
        title,
        description,
        name,
        videoUrl: result.secure_url,
        uploadedAt: new Date(),
      };
  
      
      const db = getDb("videos"); 
      const updatedDoc = await db.updateOne(
        { email: email }, 
        { $push: { videos: videoData } }, 
        { upsert: true } 
      );
  
      res.status(200).json({ videoUrl: result.secure_url });
    } catch (error) {
      res.status(500).json({ message: 'Upload failed', error: error.message });
    }
  });

  router.get('/fetch', async (req, res) => {
    try {
        const db = getDb("videos");
        const users = await db.find().toArray();
        if(users.length==0) return res.status(200).json({msg:'No Video Available'});
        let allVideos = [];

        users.forEach(user => {
            if (user.videos) {
                user.videos.forEach(video => {
                    allVideos.push({ ...video, creator: user._id });
                });
            }
        });

        allVideos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

        let result = [];
        let creatorQueue = new Map();

        for (let video of allVideos) {
            if (result.length === 0 || result[result.length - 1].creator !== video.creator) {
                result.push(video);
            } else {
                if (!creatorQueue.has(video.creator)) {
                    creatorQueue.set(video.creator, []);
                }
                creatorQueue.get(video.creator).push(video);
            }
        }

        for (let [creator, videos] of creatorQueue) {
            let index = 1;
            while (videos.length) {
                if (index >= result.length || result[index].creator !== creator) {
                    result.splice(index, 0, videos.shift());
                }
                index += 2; 
            }
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch videos', error: error.message });
    }
});



router.get('/prep',async (req,res)=>{   
  try{ const collectionName=getDb('Preps');
   const data=await collectionName.find().toArray();
   console.log(data);
   return res.status(200).send({topics:data});}
   catch(error){
       console.log(error);
   }
});



router.get('/prepDetail/:topic',async (req,res)=>{   
  try{ 
   const title = req.params.topic;
   console.log(title);
   const collectionName=getDb(title);
   const data=await collectionName.find().toArray();
   console.log(data);
   return res.status(200).send({topics:data});}
   catch(error){
       console.log(error);
   }
});


  module.exports=router;