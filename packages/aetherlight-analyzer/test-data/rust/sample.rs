/// User struct representing a system user
#[derive(Debug, Clone)]
pub struct User {
    pub id: String,
    pub name: String,
    age: u32,
}

/// Animal trait for polymorphic behavior
pub trait Animal {
    fn make_sound(&self) -> String;
    async fn sleep(&self, duration: u32);
}

impl User {
    pub fn new(id: String, name: String, age: u32) -> Self {
        Self { id, name, age }
    }

    pub fn get_name(&self) -> &str {
        &self.name
    }
}

/// Add two numbers
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
