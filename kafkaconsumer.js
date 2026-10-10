import kafka from './kafka.js'
import  {ChatMessage} from './model.js'



const kafkaconsumer=async(pubClient)=>{
    const consumer=kafka.consumer({groupId:"chat"})
 await consumer.connect();
await consumer.subscribe({
    topic:'Global_Chat_Channel',
    fromBeginning:false,
})
 await consumer.run({
    eachMessage:async({topic,partition,message})=>{
try{
    const value=message.value.toString();
    const payload=JSON.parse(value);
    console.log("payload from parttion",partition)
    console.log(payload)
    let user;
  try{
     user= await ChatMessage.findOne({user})
     if(!user) return 
}
catch(error){
    console.log("eroro on fetchign db",error)
}
   console.log('last msg from',userr)
    await ChatMessage.create({
                    user: payload.user,
                    text: payload.text,
                    time: payload.time
                });
                
                console.log(`💾 Chat message safely saved to MongoDB`);

                // 3. Broadcast across your server cluster via your existing Redis Pub/Sub channel
                pubClient.publish('GLOBAL_CHAT_CHANNEL', JSON.stringify(payload));

}

catch(error){
    console.error('erro accessing the data')
}
    }


})}
export default kafkaconsumer;