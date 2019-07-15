using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class weg : MonoBehaviour
{
    public List<schachfeld> wegarray;
    public int moves; // anzahl der moves bis attacken kann

    public weg(List<schachfeld> wegarray)
    {
        this.wegarray = wegarray;
    }

    // Start is called before the first frame update
    void Start()
    {

    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
