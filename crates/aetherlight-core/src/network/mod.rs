/**
 * Network Module - Distributed Pattern Network Infrastructure
 *
 * DESIGN DECISION: Hierarchical DHT for pattern distribution with zero-marginal-cost scaling
 * WHY: Users provide storage/bandwidth/network, company runs zero infrastructure at scale
 *
 * REASONING CHAIN:
 * 1. Traditional cloud storage = $123K/month for 1M users (PostgreSQL + Redis + bandwidth)
 * 2. DHT = users provide storage, we coordinate = ~$50/month for bootstrap nodes
 * 3. Hierarchical DHT reduces lookup hops from O(log N) to O(log log N)
 * 4. 1M patterns × K=20 replication = 20M shards distributed across user nodes
 * 5. Result: 99.96% cost reduction, infinite scalability
 *
 * PATTERN: Pattern-DHT-001 (Hierarchical DHT for Pattern Distribution)
 * RELATED: Pattern-STORAGE-001 (Multi-Layer Storage), Pattern-MESH-001 (Offline Mesh)
 * FUTURE: Implement full Kademlia routing table, regional supernodes, global index
 */

pub mod dht;
pub mod routing_table;
pub mod rpc;

pub use dht::{
    HierarchicalDHTClient, PublishResult, FindResult, DHTError,
    KademliaNode, NodeStatus, NodeSource
};
pub use routing_table::{RoutingTable, AddNodeResult};
pub use rpc::{
    RPCClient, RPCMessage, PingRequest, PongResponse,
    FindNodeRequest, FindNodeResponse, StoreRequest, StoreResponse,
    FindValueRequest, FindValueResponse, FindValueResult, NodeInfo
};
