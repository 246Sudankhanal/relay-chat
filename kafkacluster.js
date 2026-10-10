import kafka from './kafka.js'
const admin=kafka.admin();
admin.connect();//usualy aysnc in natur so await 
const createTopics=async()=>{
    await admin.createTopics({
        topics:[{
            topic:"golddata",
            numPartitions:1,
            replicationFactor:1,
        }]
    })
}
export default createTopics;