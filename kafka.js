import {Kafka} from 'kafkajs'
const kafka = new Kafka({
  clientId: 'tradelens-producer',
  brokers: ['127.0.0.1:9092'],
  retry: {
    initialRetryTime: 300,
    retries: 10 // Gives the broker more time to elect a coordinator
  } // Double check your local Kafka port!
});
export default kafka;